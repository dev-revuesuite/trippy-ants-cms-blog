import type { MetadataRoute } from 'next';
import { createServiceClient } from '@/lib/supabase/server';
import { absoluteUrl } from '@/lib/utils';

export const revalidate = 600;

const PAGE_SIZE = 1000;

type SitemapPost = { slug: string; updated_at: string | null; published_at: string | null };

async function fetchAllPublishedPosts(
  supabase: ReturnType<typeof createServiceClient>,
): Promise<SitemapPost[]> {
  const now = new Date().toISOString();
  const posts: SitemapPost[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('posts')
      .select('slug, updated_at, published_at')
      .eq('status', 'published')
      .lte('published_at', now)
      .order('published_at', { ascending: true })
      .order('slug', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data?.length) break;

    posts.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return posts;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServiceClient();

  const [posts, { data: categories }, { data: tags }, { data: authors }] = await Promise.all([
    fetchAllPublishedPosts(supabase),
    supabase.from('categories').select('slug'),
    supabase.from('tags').select('slug'),
    supabase.from('authors').select('slug'),
  ]);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), changeFrequency: 'daily', priority: 0.9 },
  ];

  const postEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: absoluteUrl(`/${p.slug}`),
    lastModified: p.updated_at
      ? new Date(p.updated_at)
      : p.published_at
        ? new Date(p.published_at)
        : undefined,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const categoryEntries: MetadataRoute.Sitemap = (categories ?? []).map((c) => ({
    url: absoluteUrl(`/?category=${c.slug}`),
    changeFrequency: 'weekly',
    priority: 0.5,
  }));

  const tagEntries: MetadataRoute.Sitemap = (tags ?? []).map((t) => ({
    url: absoluteUrl(`/tag/${t.slug}`),
    changeFrequency: 'monthly',
    priority: 0.4,
  }));

  const authorEntries: MetadataRoute.Sitemap = (authors ?? []).map((a) => ({
    url: absoluteUrl(`/author/${a.slug}`),
    changeFrequency: 'monthly',
    priority: 0.4,
  }));

  return [...staticEntries, ...postEntries, ...categoryEntries, ...tagEntries, ...authorEntries];
}
