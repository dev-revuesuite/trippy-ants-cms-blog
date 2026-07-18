export { cn } from './cn';
export { slugify } from './slug';

/** Estimate reading time from HTML string. ~225 wpm. */
export function calcReadingTime(html: string | null | undefined) {
  if (!html) return 0;
  const text = html.replace(/<[^>]+>/g, ' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 225));
}

export function formatDate(iso: string | Date) {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function formatRelativeTime(iso: string | Date) {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return mins <= 1 ? '1m ago' : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

export function firstName(fullName: string | null | undefined, fallback = 'there') {
  if (!fullName?.trim()) return fallback;
  return fullName.trim().split(/\s+/)[0] ?? fallback;
}

export function absoluteUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://www.trippyants.com/blog';
  return `${base}${path.startsWith('/') ? path : '/' + path}`;
}

export function escapeXml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Strip HTML to plain-text excerpt. */
export function stripHtml(html: string, max = 200) {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text;
}

/** Escape content embedded in XML CDATA (handles literal ]]> sequences). */
export function escapeCdata(str: string) {
  return str.replace(/]]>/g, ']]]]><![CDATA[>');
}

/** Alt text for featured / card images — prefer excerpt over repeating the title. */
export function featuredImageAlt(title: string, excerpt?: string | null) {
  const trimmed = excerpt?.trim();
  if (trimmed) return trimmed;
  return `Illustration for ${title}`;
}
