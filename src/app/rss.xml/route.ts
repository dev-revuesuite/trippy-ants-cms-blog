import { createServiceClient } from '@/lib/supabase/server';
import { absoluteUrl, escapeCdata, escapeXml, stripHtml } from '@/lib/utils';
import { BLOG_TITLE } from '@/lib/seo';

export const revalidate = 600;

export async function GET() {
  const supabase = createServiceClient();
  const { data: posts } = await supabase
    .from('posts')
    .select('title, slug, excerpt, content_html, published_at, updated_at, author_id')
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(50);

  const authorIds = [...new Set((posts ?? []).map((p) => p.author_id).filter(Boolean))] as string[];
  const { data: authors } = authorIds.length
    ? await supabase.from('authors').select('id,name').in('id', authorIds)
    : { data: [] };
  const authorMap = new Map((authors ?? []).map((a: { id: string; name: string }) => [a.id, a.name]));

  const items = (posts ?? []).map((p) => `
    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${absoluteUrl(`/${p.slug}`)}</link>
      <guid isPermaLink="true">${absoluteUrl(`/${p.slug}`)}</guid>
      <pubDate>${p.published_at ? new Date(p.published_at).toUTCString() : ''}</pubDate>
      <dc:creator>${escapeXml(authorMap.get(p.author_id!) || 'Trippy Ants')}</dc:creator>
      <description>${escapeXml(p.excerpt || stripHtml(p.content_html || ''))}</description>
      <content:encoded><![CDATA[${escapeCdata(p.content_html || '')}]]></content:encoded>
    </item>`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(BLOG_TITLE)}</title>
    <link>${absoluteUrl('/')}</link>
    <atom:link href="${absoluteUrl('/rss.xml')}" rel="self" type="application/rss+xml" />
    <description>Design stories and creative insights from Trippy Ants Design.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=86400',
    },
  });
}
