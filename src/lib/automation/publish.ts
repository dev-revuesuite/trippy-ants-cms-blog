import 'server-only';
import { revalidatePath } from 'next/cache';
import { createServiceClient } from '@/lib/supabase/server';
import { absoluteUrl, calcReadingTime, slugify } from '@/lib/utils';
import type { GeneratedArticle, PublishedPostResult } from './types';

const SYSTEM_AUTHOR_SLUG = 'trippy-ants-editorial';

function defaultCategoryName(): string {
  return process.env.AUTOMATION_DEFAULT_CATEGORY?.trim() || 'Design';
}

async function resolveSystemAuthorId(): Promise<string> {
  const envId = process.env.SYSTEM_AUTHOR_ID?.trim();
  if (envId) return envId;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('authors')
    .select('id')
    .eq('slug', SYSTEM_AUTHOR_SLUG)
    .single();

  if (error || !data) {
    throw new Error(
      'System author not found. Run supabase/automation.sql or set SYSTEM_AUTHOR_ID.',
    );
  }
  return data.id;
}

async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  const supabase = createServiceClient();
  let candidate = slugify(baseSlug);
  if (!candidate) candidate = `post-${Date.now().toString(36)}`;

  for (let suffix = 0; suffix < 20; suffix++) {
    const slug = suffix === 0 ? candidate : `${candidate}-${suffix}`;
    const { data } = await supabase.from('posts').select('id').eq('slug', slug).maybeSingle();
    if (!data) return slug;
  }

  return `${candidate}-${Date.now().toString(36)}`;
}

async function resolveCategoryId(categoryName?: string | null): Promise<string | null> {
  const name = (categoryName?.trim() || defaultCategoryName()).trim();
  if (!name) return null;

  const supabase = createServiceClient();
  const slug = slugify(name);

  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('categories')
    .insert({ name, slug })
    .select('id')
    .single();
  if (error) throw new Error(`Category create failed: ${error.message}`);
  return created.id;
}

async function resolveTagIds(tagNames: string[]): Promise<string[]> {
  const supabase = createServiceClient();
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const raw of tagNames) {
    const name = raw.trim();
    if (!name) continue;

    const slug = slugify(name);
    if (seen.has(slug)) continue;
    seen.add(slug);

    const { data: existing } = await supabase
      .from('tags')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existing) {
      ids.push(existing.id);
      continue;
    }

    const { data: created, error } = await supabase
      .from('tags')
      .insert({ name, slug })
      .select('id')
      .single();
    if (error) throw new Error(`Tag create failed: ${error.message}`);
    ids.push(created.id);
  }

  return ids;
}

function revalidatePublishedRoutes(slug: string): void {
  revalidatePath('/');
  revalidatePath(`/${slug}`);
  revalidatePath('/sitemap.xml');
}

export async function publishGeneratedPost(params: {
  article: GeneratedArticle;
  contentHtml: string;
  featuredImageUrl?: string | null;
}): Promise<PublishedPostResult> {
  const { article, contentHtml, featuredImageUrl } = params;

  const supabase = createServiceClient();
  const [authorId, categoryId, slug] = await Promise.all([
    resolveSystemAuthorId(),
    resolveCategoryId(null),
    ensureUniqueSlug(article.slug || article.title),
  ]);

  const tagIds = await resolveTagIds(article.tags);
  const publishedAt = new Date().toISOString();
  const canonicalUrl = absoluteUrl(`/${slug}`);
  const imageUrl = featuredImageUrl?.trim() || null;

  const payload = {
    title: article.title,
    slug,
    excerpt: article.excerpt,
    content_json: null,
    content_html: contentHtml,
    featured_image: imageUrl,
    status: 'published' as const,
    published_at: publishedAt,
    author_id: authorId,
    category_id: categoryId,
    meta_title: article.meta_title,
    meta_description: article.meta_description,
    focus_keyword: article.focus_keyword || null,
    canonical_url: canonicalUrl,
    og_image: imageUrl,
    robots: null,
    schema_type: 'Article',
    faqs: article.faqs,
    cta_block: null,
    reading_time: calcReadingTime(contentHtml),
  };

  const { data: post, error: insertErr } = await supabase
    .from('posts')
    .insert(payload)
    .select('id, slug')
    .single();

  if (insertErr || !post) {
    throw new Error(`Post insert failed: ${insertErr?.message ?? 'unknown error'}`);
  }

  if (tagIds.length) {
    const { error: tagErr } = await supabase.from('post_tags').insert(
      tagIds.map((tag_id) => ({ post_id: post.id, tag_id })),
    );
    if (tagErr) {
      await supabase.from('posts').delete().eq('id', post.id);
      throw new Error(`Tag link failed: ${tagErr.message}`);
    }
  }

  revalidatePublishedRoutes(post.slug);

  return {
    postId: post.id,
    slug: post.slug,
    url: canonicalUrl,
  };
}
