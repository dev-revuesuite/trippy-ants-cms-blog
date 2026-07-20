import 'server-only';
import { slugify } from '@/lib/utils';
import type { SheetRow, StatusWriteback, FailureAlert } from './types';

const REQUEST_TIMEOUT_MS = Number.parseInt(process.env.GOOGLE_SHEETS_TIMEOUT_MS ?? '', 10) || 30_000;

function webhookUrl(): string {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!url) throw new Error('GOOGLE_SHEETS_WEBHOOK_URL is not configured');
  return url;
}

function secret(): string {
  return process.env.GOOGLE_SHEETS_SECRET ?? '';
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: 'follow' });
  } finally {
    clearTimeout(timer);
  }
}

async function parseJsonBody(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`Sheet webhook returned non-JSON (status ${res.status}): ${text.slice(0, 200)}`);
  }
}

function normalizeRow(raw: Record<string, unknown>): SheetRow | null {
  const title = String(raw.title ?? '').trim();
  if (!title) return null;

  const id = String(raw.id ?? '').trim();
  const sourceKey = id || `title:${slugify(title)}`;
  const sheetRowNum = Number(raw.row ?? raw.sheetRow ?? raw.rowNumber);

  return {
    sourceKey,
    sheetRow: Number.isFinite(sheetRowNum) ? sheetRowNum : 0,
    title,
    imageUrl: String(raw.image_url ?? raw.imageUrl ?? '').trim(),
  };
}

export async function fetchPendingRows(limit = 50): Promise<SheetRow[]> {
  const url = new URL(webhookUrl());
  url.searchParams.set('action', 'pending');
  url.searchParams.set('secret', secret());
  url.searchParams.set('limit', String(limit));

  const res = await fetchWithTimeout(url.toString(), { method: 'GET' });
  const body = await parseJsonBody(res);
  if (!res.ok || body.success !== true) {
    throw new Error(`Sheet read failed: ${String(body.error ?? res.status)}`);
  }

  const rows = Array.isArray(body.rows) ? (body.rows as Record<string, unknown>[]) : [];
  return rows
    .map(normalizeRow)
    .filter((r): r is SheetRow => r !== null);
}

async function postAction(payload: Record<string, unknown>): Promise<void> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchWithTimeout(webhookUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, secret: secret() }),
      });
      const body = await parseJsonBody(res);
      if (!res.ok || body.success !== true) {
        throw new Error(`Sheet webhook action failed: ${String(body.error ?? res.status)}`);
      }
      return;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

export async function writeBackStatus(update: StatusWriteback): Promise<boolean> {
  if (!update.sheetRow) return false;
  try {
    await postAction({
      action: 'update',
      row: update.sheetRow,
      status: update.status,
      post_url: update.postUrl ?? '',
      error: update.error ?? '',
      processed_at: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.warn('[automation] sheet write-back failed:', err);
    return false;
  }
}

export async function sendFailureAlert(failures: FailureAlert[]): Promise<boolean> {
  if (!failures.length) return false;
  try {
    await postAction({ action: 'alert', failures });
    return true;
  } catch (err) {
    console.warn('[automation] failure-alert email failed:', err);
    return false;
  }
}
