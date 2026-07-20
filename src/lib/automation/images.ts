import 'server-only';
import { randomBytes } from 'crypto';
import sharp from 'sharp';
import { createServiceClient } from '@/lib/supabase/server';
import { featuredImageAlt } from '@/lib/utils';
import type { FeaturedImageResult } from './types';

/**
 * Featured image from the Google Sheet (CEO-supplied URL).
 * Downloads the image, resizes to 16:9 WebP, uploads to Supabase Storage.
 *
 * Image failure is non-fatal — returns null so the article can still publish.
 */

const FETCH_TIMEOUT_MS = 20_000;
const IN_CALL_RETRIES = 1;
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_REDIRECTS = 5;

const OUTPUT_WIDTH = 1200;
const OUTPUT_HEIGHT = 675;

function safeStorageSlug(slug: string): string {
  return slug.replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'post';
}

function isPrivateOrBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host === 'metadata.google.internal') return true;

  const ipMatch = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipMatch) {
    const a = Number(ipMatch[1]);
    const b = Number(ipMatch[2]);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }

  return host === '::1' || host.startsWith('fe80:') || host.startsWith('fc') || host.startsWith('fd');
}

/** Reject non-public destinations before fetching (SSRF guard). */
export function assertSafeImageUrl(urlString: string): URL {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error('Invalid image URL');
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Invalid image URL scheme');
  }
  if (url.username || url.password) {
    throw new Error('Image URL must not include credentials');
  }
  if (isPrivateOrBlockedHost(url.hostname)) {
    throw new Error('Blocked image URL host');
  }

  return url;
}

/** Turn common Google Drive share links into a direct download URL. */
export function normalizeImageUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const imageFormula = trimmed.match(/^=IMAGE\s*\(\s*"([^"]+)"/i);
  const candidate = imageFormula?.[1]?.trim() ?? trimmed;

  if (!/^https?:\/\//i.test(candidate)) return null;

  const driveMatch = candidate.match(
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)|drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)|drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/,
  );
  const fileId = driveMatch?.[1] || driveMatch?.[2] || driveMatch?.[3];
  if (fileId) {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  return candidate;
}

async function readResponseBody(res: Response): Promise<Buffer> {
  const contentLength = res.headers.get('content-length');
  if (contentLength) {
    const declared = Number.parseInt(contentLength, 10);
    if (Number.isFinite(declared) && declared > MAX_BYTES) {
      throw new Error('Image file is too large (max 10 MB)');
    }
  }

  if (!res.body) {
    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_BYTES) {
      throw new Error('Image file is too large (max 10 MB)');
    }
    if (arrayBuffer.byteLength === 0) {
      throw new Error('Image download returned empty data');
    }
    return Buffer.from(arrayBuffer);
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      throw new Error('Image file is too large (max 10 MB)');
    }
    chunks.push(value);
  }

  if (total === 0) {
    throw new Error('Image download returned empty data');
  }

  return Buffer.concat(chunks);
}

async function fetchImageBytes(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    let current = assertSafeImageUrl(url).toString();

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const res = await fetch(current, {
        signal: controller.signal,
        redirect: 'manual',
        headers: { Accept: 'image/*,*/*;q=0.8' },
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) throw new Error('Image redirect missing location header');
        current = assertSafeImageUrl(new URL(location, current).toString()).toString();
        continue;
      }

      if (!res.ok) {
        throw new Error(`Image download failed (${res.status})`);
      }

      const contentType = res.headers.get('content-type') ?? '';
      if (contentType.includes('text/html')) {
        throw new Error('Image URL returned a web page, not an image — use a direct link or public Drive file');
      }

      return readResponseBody(res);
    }

    throw new Error('Too many image redirects');
  } finally {
    clearTimeout(timer);
  }
}

async function processToWebp(raw: Buffer): Promise<Buffer> {
  return sharp(raw)
    .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, { fit: 'cover', position: 'centre' })
    .webp({ quality: 85 })
    .toBuffer();
}

async function uploadToStorage(
  slug: string,
  storageKey: string,
  webpBytes: Buffer,
  altText: string,
): Promise<FeaturedImageResult> {
  const supabase = createServiceClient();
  const safeSlug = safeStorageSlug(slug);
  const uniqueSuffix = storageKey.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 36)
    || randomBytes(6).toString('hex');
  const storagePath = `auto/${safeSlug}-${uniqueSuffix}.webp`;
  const filename = `${safeSlug}-${uniqueSuffix}.webp`;

  const { error: upErr } = await supabase.storage.from('media').upload(storagePath, webpBytes, {
    contentType: 'image/webp',
    cacheControl: '31536000',
    upsert: false,
  });
  if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`);

  const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(storagePath);

  const { error: dbErr } = await supabase.from('media').insert({
    url: publicUrl,
    storage_path: storagePath,
    filename,
    mime_type: 'image/webp',
    width: OUTPUT_WIDTH,
    height: OUTPUT_HEIGHT,
    size_bytes: webpBytes.length,
    alt_text: altText,
    folder: 'auto',
    uploaded_by: null,
  });
  if (dbErr) {
    await supabase.storage.from('media').remove([storagePath]);
    throw new Error(`Media row insert failed: ${dbErr.message}`);
  }

  return { url: publicUrl, storagePath, altText };
}

/**
 * Download the CEO's sheet image URL and upload it as the post featured image.
 * Returns null if no URL, or on failure (non-fatal).
 */
export async function importFeaturedImageFromSheet(params: {
  imageUrl: string | null | undefined;
  slug: string;
  title: string;
  excerpt?: string | null;
  storageKey?: string;
}): Promise<FeaturedImageResult | null> {
  const normalized = normalizeImageUrl(params.imageUrl ?? '');
  if (!normalized) return null;

  const altText = featuredImageAlt(params.title, params.excerpt);

  let lastError: unknown;
  for (let attempt = 0; attempt <= IN_CALL_RETRIES; attempt++) {
    try {
      const raw = await fetchImageBytes(normalized);
      const webpBytes = await processToWebp(raw);
      return await uploadToStorage(
        params.slug,
        params.storageKey ?? randomBytes(6).toString('hex'),
        webpBytes,
        altText,
      );
    } catch (err) {
      lastError = err;
      if (attempt < IN_CALL_RETRIES) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
  }

  console.warn(
    '[automation] sheet featured image import failed:',
    lastError instanceof Error ? lastError.message : lastError,
  );
  return null;
}
