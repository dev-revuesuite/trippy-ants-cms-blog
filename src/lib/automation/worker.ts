import 'server-only';
import { createServiceClient } from '@/lib/supabase/server';
import { absoluteUrl } from '@/lib/utils';
import { generateArticle } from './generate';
import { importFeaturedImageFromSheet } from './images';
import { publishGeneratedPost } from './publish';
import { hasMeaningfulContent, sanitizeArticleHtml } from './sanitize';
import {
  fetchPendingRows,
  sendFailureAlert,
  writeBackStatus,
} from './sheets';
import type {
  ContentJobRow,
  FailureAlert,
  JobDraft,
  PipelineStep,
  SheetRow,
} from './types';

export interface TickResult {
  synced: number;
  claimed: number;
  step?: PipelineStep | null;
  published: number;
  retried: number;
  failed: number;
  skippedReason?: string;
}

export interface ReclaimResult {
  reclaimed: number;
  failed: number;
}

const ACTIVE_STEPS: PipelineStep[] = ['generating', 'imaging', 'publishing'];

function envInt(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function startOfTodayUtc(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

function jobToSheetRow(job: ContentJobRow): SheetRow {
  return {
    sourceKey: job.source_key,
    sheetRow: job.sheet_row ?? 0,
    title: job.title,
    imageUrl: job.image_url ?? '',
  };
}

function parseJobDraft(job: ContentJobRow): JobDraft {
  const raw = job.draft_json;
  if (!raw || typeof raw !== 'object') {
    throw new Error('Missing draft — regenerate from pending');
  }
  const draft = raw as JobDraft;
  if (!draft.article || !draft.contentHtml) {
    throw new Error('Invalid draft_json on job');
  }
  return draft;
}

function idleStepAfterFailure(activeStep: PipelineStep): PipelineStep {
  switch (activeStep) {
    case 'generating':
      return 'pending';
    case 'imaging':
      return 'draft_ready';
    case 'publishing':
      return 'image_ready';
    default:
      return 'pending';
  }
}

const BACKLOG_STEPS: PipelineStep[] = [
  'pending',
  'draft_ready',
  'image_ready',
  'generating',
  'imaging',
  'publishing',
];

async function syncSheetToLedger(): Promise<number> {
  const supabase = createServiceClient();
  const { count: backlog } = await supabase
    .from('content_jobs')
    .select('*', { count: 'exact', head: true })
    .in('step', BACKLOG_STEPS);

  if ((backlog ?? 0) > 0) return 0;

  let rows;
  try {
    rows = await fetchPendingRows(50);
  } catch (err) {
    console.warn('[automation] sheet sync skipped:', err);
    return 0;
  }

  if (!rows.length) return 0;

  let synced = 0;

  for (const row of rows) {
    if (!row.imageUrl.trim()) continue;

    const { data: existing } = await supabase
      .from('content_jobs')
      .select('id')
      .eq('source_key', row.sourceKey)
      .maybeSingle();

    if (existing) continue;

    const { error } = await supabase.from('content_jobs').insert({
      source_key: row.sourceKey,
      sheet_row: row.sheetRow || null,
      title: row.title,
      image_url: row.imageUrl || null,
      status: 'pending',
      step: 'pending',
    });
    if (!error) synced++;
  }

  return synced;
}

async function countPublishedToday(): Promise<number> {
  const supabase = createServiceClient();
  const { count } = await supabase
    .from('content_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('step', 'done')
    .gte('completed_at', startOfTodayUtc());
  return count ?? 0;
}

async function finalizePublishedJob(
  job: ContentJobRow,
  published: { postId: string; url: string },
): Promise<void> {
  const supabase = createServiceClient();

  const { error: updateErr } = await supabase
    .from('content_jobs')
    .update({
      status: 'done',
      step: 'done',
      post_id: published.postId,
      post_url: published.url,
      completed_at: new Date().toISOString(),
      error: null,
      claimed_at: null,
    })
    .eq('id', job.id);

  if (updateErr) throw new Error(`Ledger update failed: ${updateErr.message}`);

  if (job.sheet_row) {
    await writeBackStatus({
      sheetRow: job.sheet_row,
      status: 'published',
      postUrl: published.url,
    });
  }
}

async function markStepIdle(jobId: string, step: PipelineStep): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from('content_jobs')
    .update({
      step,
      status: 'pending',
      claimed_at: null,
      error: null,
    })
    .eq('id', jobId);
}

async function handleStepFailure(
  job: ContentJobRow,
  activeStep: PipelineStep,
  message: string,
): Promise<{ outcome: 'retry' | 'failed' }> {
  const supabase = createServiceClient();
  const attempts = job.attempts + 1;
  const exhausted = attempts >= job.max_attempts;
  const nextStep: PipelineStep = exhausted ? 'failed' : idleStepAfterFailure(activeStep);

  await supabase
    .from('content_jobs')
    .update({
      step: nextStep,
      status: exhausted ? 'failed' : 'pending',
      attempts,
      error: message,
      claimed_at: null,
    })
    .eq('id', job.id);

  if (exhausted && job.sheet_row) {
    await writeBackStatus({
      sheetRow: job.sheet_row,
      status: 'failed',
      error: message.slice(0, 200),
    });
  }

  return { outcome: exhausted ? 'failed' : 'retry' };
}

async function runGenerateStep(job: ContentJobRow): Promise<{ outcome: 'advanced' | 'retry' | 'failed'; error?: string }> {
  const supabase = createServiceClient();

  if (job.sheet_row) {
    await writeBackStatus({ sheetRow: job.sheet_row, status: 'processing' });
  }

  try {
    const article = await generateArticle(jobToSheetRow(job));
    const contentHtml = sanitizeArticleHtml(article.content_html);

    if (!hasMeaningfulContent(contentHtml)) {
      throw new Error('Generated article body is too short or empty after sanitization');
    }

    const draft: JobDraft = { article, contentHtml };
    const { error } = await supabase
      .from('content_jobs')
      .update({
        draft_json: draft,
        step: 'draft_ready',
        status: 'pending',
        claimed_at: null,
        error: null,
      })
      .eq('id', job.id);

    if (error) throw new Error(`Draft save failed: ${error.message}`);
    return { outcome: 'advanced' };
  } catch (err) {
    const message = (err instanceof Error ? err.message : String(err)).slice(0, 500);
    const { outcome } = await handleStepFailure(job, 'generating', message);
    return { outcome, error: message };
  }
}

async function runImageStep(job: ContentJobRow): Promise<{ outcome: 'advanced' | 'retry' | 'failed'; error?: string }> {
  const supabase = createServiceClient();
  const draft = parseJobDraft(job);

  try {
    const image = await importFeaturedImageFromSheet({
      imageUrl: job.image_url,
      slug: draft.article.slug,
      title: draft.article.title,
      excerpt: draft.article.excerpt,
      storageKey: job.id,
    });

    const { error } = await supabase
      .from('content_jobs')
      .update({
        featured_image_url: image?.url ?? null,
        step: 'image_ready',
        status: 'pending',
        claimed_at: null,
        error: null,
      })
      .eq('id', job.id);

    if (error) throw new Error(`Image save failed: ${error.message}`);
    return { outcome: 'advanced' };
  } catch (err) {
    const message = (err instanceof Error ? err.message : String(err)).slice(0, 500);
    const { outcome } = await handleStepFailure(job, 'imaging', message);
    return { outcome, error: message };
  }
}

async function runPublishStep(job: ContentJobRow): Promise<{ outcome: 'published' | 'retry' | 'failed'; error?: string }> {
  const supabase = createServiceClient();

  if (job.post_id) {
    try {
      let url = job.post_url?.trim() ?? '';
      if (!url) {
        const { data: post } = await supabase
          .from('posts')
          .select('slug')
          .eq('id', job.post_id)
          .maybeSingle();
        if (!post) throw new Error('Linked post no longer exists');
        url = absoluteUrl(`/${post.slug}`);
      }
      await finalizePublishedJob(job, { postId: job.post_id, url });
      return { outcome: 'published' };
    } catch (err) {
      const message = (err instanceof Error ? err.message : String(err)).slice(0, 500);
      const { outcome } = await handleStepFailure(job, 'publishing', message);
      return { outcome, error: message };
    }
  }

  const draft = parseJobDraft(job);

  try {
    const published = await publishGeneratedPost({
      article: draft.article,
      contentHtml: draft.contentHtml,
      featuredImageUrl: job.featured_image_url,
    });

    const { error: linkErr } = await supabase
      .from('content_jobs')
      .update({
        post_id: published.postId,
        post_url: published.url,
      })
      .eq('id', job.id);

    if (linkErr) throw new Error(`Ledger link failed: ${linkErr.message}`);

    await finalizePublishedJob(job, published);
    return { outcome: 'published' };
  } catch (err) {
    const message = (err instanceof Error ? err.message : String(err)).slice(0, 500);
    const { outcome } = await handleStepFailure(job, 'publishing', message);
    return { outcome, error: message };
  }
}

async function processPipelineStep(
  job: ContentJobRow,
): Promise<{ outcome: 'published' | 'advanced' | 'retry' | 'failed'; error?: string }> {
  switch (job.step) {
    case 'generating':
      return runGenerateStep(job);
    case 'imaging':
      return runImageStep(job);
    case 'publishing':
      return runPublishStep(job);
    default:
      throw new Error(`Unexpected pipeline step: ${job.step}`);
  }
}

export async function runReclaimTick(): Promise<ReclaimResult> {
  const supabase = createServiceClient();
  const staleMinutes = envInt('STALE_PROCESSING_MINUTES', 5);
  const cutoff = new Date(Date.now() - staleMinutes * 60 * 1000).toISOString();

  const { data: stale } = await supabase
    .from('content_jobs')
    .select('*')
    .in('step', ACTIVE_STEPS)
    .lt('claimed_at', cutoff);

  if (!stale?.length) return { reclaimed: 0, failed: 0 };

  let reclaimed = 0;
  let failed = 0;

  for (const job of stale as ContentJobRow[]) {
    if (job.step === 'publishing' && job.post_id) {
      const { outcome } = await runPublishStep(job);
      if (outcome === 'published') reclaimed++;
      else if (outcome === 'failed') failed++;
      else reclaimed++;
      continue;
    }

    if (job.step === 'generating' && job.draft_json) {
      await markStepIdle(job.id, 'draft_ready');
      reclaimed++;
      continue;
    }

    const idleStep = idleStepAfterFailure(job.step);
    await supabase
      .from('content_jobs')
      .update({
        step: idleStep,
        status: 'pending',
        attempts: job.attempts,
        error: `Step "${job.step}" interrupted after ${staleMinutes}m — will retry`,
        claimed_at: null,
      })
      .eq('id', job.id);
    reclaimed++;
  }

  return { reclaimed, failed };
}

export async function runAutomationTick(): Promise<TickResult> {
  const dailyCap = envInt('DAILY_CAP', 55);

  await runReclaimTick();
  const synced = await syncSheetToLedger();
  const publishedToday = await countPublishedToday();

  const capRemaining = Math.max(0, dailyCap - publishedToday);
  const allowNew = capRemaining > 0;

  const supabase = createServiceClient();
  const { data: jobs, error: claimErr } = await supabase.rpc('claim_next_pipeline_job', {
    allow_new: allowNew,
  });

  if (claimErr) {
    throw new Error(`Claim pipeline job failed: ${claimErr.message}`);
  }

  const claimed = (jobs ?? []) as ContentJobRow[];
  if (!claimed.length) {
    return {
      synced,
      claimed: 0,
      published: 0,
      retried: 0,
      failed: 0,
      skippedReason: capRemaining <= 0
        ? `Daily cap reached (${dailyCap})`
        : 'No pipeline jobs ready',
    };
  }

  const job = claimed[0];

  if (job.step === 'publishing' && capRemaining <= 0) {
    await markStepIdle(job.id, 'image_ready');
    return {
      synced,
      claimed: 0,
      published: 0,
      retried: 0,
      failed: 0,
      skippedReason: `Daily cap reached (${dailyCap}) — publish deferred`,
    };
  }

  const alertFailures: FailureAlert[] = [];
  let published = 0;
  let retried = 0;
  let failed = 0;

  const { outcome, error } = await processPipelineStep(job);
  if (outcome === 'published') published++;
  else if (outcome === 'retry') retried++;
  else if (outcome === 'failed') {
    failed++;
    alertFailures.push({ title: job.title, error: error ?? 'Unknown error' });
  }

  if (alertFailures.length) {
    await sendFailureAlert(alertFailures);
  }

  return {
    synced,
    claimed: 1,
    step: job.step,
    published,
    retried,
    failed,
  };
}
