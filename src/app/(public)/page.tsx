import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { NewsletterCTA } from '@/components/site/cta';
import { AuthorAvatar } from '@/components/site/brand-mark';
import { buildMetadata, BLOG_TITLE } from '@/lib/seo';
import { formatDate, featuredImageAlt } from '@/lib/utils';
import { Search } from 'lucide-react';

export const revalidate = 60;

export const metadata = buildMetadata({
  title: BLOG_TITLE,
  description:
    'Design stories, branding insights, UI/UX thinking, and creative process from Trippy Ants Design — a multi-disciplinary studio in Jaipur.',
  path: '/',
});

interface SearchParams { q?: string; page?: string; category?: string }

function buildBlogHref(page: number, params: { category?: string; q?: string }) {
  const search = new URLSearchParams();
  search.set('page', String(page));
  if (params.category) search.set('category', params.category);
  if (params.q) search.set('q', params.q);
  return `/?${search.toString()}`;
}

export default async function BlogIndex({
  searchParams,
}: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const supabase = await createClient();

  const page = Math.max(1, parseInt(sp.page || '1', 10));
  const pageSize = 9;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('posts')
    .select('id,title,slug,excerpt,featured_image,published_at,reading_time,author_id,category_id', { count: 'exact' })
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false });

  if (sp.q) {
    query = query.textSearch('search_vector', sp.q, { type: 'websearch' });
  }
  if (sp.category) {
    const { data: cat } = await supabase
      .from('categories').select('id').eq('slug', sp.category).single();
    if (cat) query = query.eq('category_id', cat.id);
  }

  const { data: posts, count } = await query.range(from, to);

  const authorIds = [...new Set((posts ?? []).map((p) => p.author_id).filter(Boolean))] as string[];
  const categoryIds = [...new Set((posts ?? []).map((p) => p.category_id).filter(Boolean))] as string[];

  const [{ data: authors }, { data: categories }, { data: allCategories }] = await Promise.all([
    authorIds.length ? supabase.from('authors').select('id,name,slug,avatar_url').in('id', authorIds) : Promise.resolve({ data: [] }),
    categoryIds.length ? supabase.from('categories').select('id,name,slug').in('id', categoryIds) : Promise.resolve({ data: [] }),
    supabase.from('categories').select('name,slug').order('name'),
  ]);

  const authorMap = new Map((authors ?? []).map((a: { id: string; name: string }) => [a.id, a]));
  const categoryMap = new Map((categories ?? []).map((c: { id: string; name: string; slug: string }) => [c.id, c]));

  const [featured, ...rest] = posts ?? [];
  const totalPages = count ? Math.ceil(count / pageSize) : 1;
  const gridPosts = page === 1 && !sp.q ? rest : (posts ?? []);

  return (
    <div className="bg-paper text-ink">
      <section className="px-7 pb-9 pt-14 text-center md:pt-[56px]">
        <p className="eyebrow eyebrow-dot">Trippy Ants Journal</p>
        <h1 className="headline-serif mx-auto mt-4 max-w-[720px] text-[clamp(2rem,5vw,3.5rem)] leading-[1.15]">
          Every masterpiece begins with a simple fold.
        </h1>
        <p className="dek-serif mx-auto mt-3.5 max-w-[580px] text-lg">
          Brand identity, UI/UX, packaging, and visual design — stories and insights from our studio in Jaipur.
        </p>
        <form className="mx-auto mt-8 flex max-w-md justify-center md:hidden" action="/">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone" />
            <input
              name="q"
              defaultValue={sp.q}
              placeholder="Search the journal…"
              className="h-10 w-full rounded-full border border-mist pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        </form>
      </section>

      <div className="flex flex-wrap justify-center gap-2 px-7 pb-9">
        <Link href="/" className={`pill ${!sp.category ? 'pill-active' : ''}`}>
          All
        </Link>
        {(allCategories ?? []).map((c: { name: string; slug: string }) => (
          <Link
            key={c.slug}
            href={`/?category=${c.slug}`}
            className={`pill ${sp.category === c.slug ? 'pill-active' : ''}`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      <div className="site-divider mx-7" />

      {featured && page === 1 && !sp.q && (
        <section className="px-7 py-10">
          <Link href={`/${featured.slug}`} className="group grid items-center gap-9 md:grid-cols-[1.1fr_1fr]">
            <div className="relative aspect-[16/11] overflow-hidden rounded-lg">
              {featured.featured_image ? (
                <Image
                  src={featured.featured_image}
                  alt={featuredImageAlt(featured.title, featured.excerpt)}
                  fill
                  sizes="(min-width: 768px) 55vw, 100vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                  priority
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-brand to-brand-600">
                  <span className="absolute bottom-6 left-6 rounded-full bg-highlight px-2.5 py-1 text-[11px] font-medium tracking-wide text-ink">
                    FEATURED
                  </span>
                </div>
              )}
            </div>
            <div>
              <p className="eyebrow mb-3.5">
                {categoryMap.get(featured.category_id!)?.name || 'Journal'}
              </p>
              <h2 className="headline-serif text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.15] group-hover:underline">
                {featured.title}
              </h2>
              <p className="dek-serif mt-3.5 text-[17px]">{featured.excerpt}</p>
              <div className="mt-5 flex items-center gap-2.5 text-[13px] text-stone">
                <AuthorAvatar name={authorMap.get(featured.author_id!)?.name} />
                <span className="font-medium text-ink">{authorMap.get(featured.author_id!)?.name}</span>
                <span>·</span>
                <time>{featured.published_at && formatDate(featured.published_at)}</time>
                <span>·</span>
                <span>{featured.reading_time} min read</span>
              </div>
            </div>
          </Link>
        </section>
      )}

      {featured && page === 1 && !sp.q && <div className="site-divider mx-7" />}

      <section className="px-7 py-10 pb-12">
        <div className="mb-7 flex items-baseline justify-between">
          <h3 className="headline-serif text-[22px]">Latest stories</h3>
          {totalPages > 1 && (
            <Link href={buildBlogHref(2, { category: sp.category })} className="text-[13px] font-medium text-brand">
              View all →
            </Link>
          )}
        </div>

        {gridPosts.length === 0 && !featured ? (
          <p className="py-24 text-center text-stone">No posts yet — check back soon.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {gridPosts.map((post) => (
              <article key={post.id} className="group">
                <Link href={`/${post.slug}`}>
                  <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-warm">
                    {post.featured_image ? (
                      <Image
                        src={post.featured_image}
                        alt={featuredImageAlt(post.title, post.excerpt)}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : null}
                  </div>
                  <div className="mt-4">
                    {post.category_id && categoryMap.get(post.category_id) && (
                      <p className="eyebrow mb-2">{categoryMap.get(post.category_id)?.name}</p>
                    )}
                    <h4 className="headline-serif text-xl leading-snug group-hover:underline">
                      {post.title}
                    </h4>
                    <p className="dek-serif mt-2 line-clamp-2 text-sm">{post.excerpt}</p>
                    <div className="mt-3.5 flex gap-2 text-xs text-stone">
                      <span className="font-medium text-ink">{authorMap.get(post.author_id!)?.name}</span>
                      <span>·</span>
                      <span>{post.reading_time} min</span>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <nav className="mt-16 flex items-center justify-center gap-4">
            {page > 1 && (
              <Link
                href={buildBlogHref(page - 1, { category: sp.category, q: sp.q })}
                className="btn-mock-light"
              >
                ← Previous
              </Link>
            )}
            <span className="text-sm text-stone">Page {page} of {totalPages}</span>
            {page < totalPages && (
              <Link
                href={buildBlogHref(page + 1, { category: sp.category, q: sp.q })}
                className="btn-mock-light"
              >
                Next →
              </Link>
            )}
          </nav>
        )}
      </section>

      <NewsletterCTA />
    </div>
  );
}
