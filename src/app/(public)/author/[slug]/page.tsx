import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { buildMetadata, BLOG_TITLE } from '@/lib/seo';
import { formatDate, featuredImageAlt } from '@/lib/utils';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: author } = await supabase.from('authors').select('*').eq('slug', slug).single();
  if (!author) return {};
  return buildMetadata({
    title: `${author.name} — ${BLOG_TITLE}`,
    description: author.bio || `Articles by ${author.name}`,
    path: `/author/${author.slug}`,
  });
}

export default async function AuthorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: author } = await supabase.from('authors').select('*').eq('slug', slug).single();
  if (!author) notFound();

  const { data: posts } = await supabase
    .from('posts')
    .select('id,title,slug,excerpt,featured_image,published_at,reading_time')
    .eq('author_id', author.id)
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false });

  return (
    <section className="container max-w-4xl py-16 md:py-24">
      <div className="flex flex-col items-start gap-6 border-b border-border pb-12 md:flex-row md:items-center">
        {author.avatar_url && (
          <Image src={author.avatar_url} alt={author.name} width={96} height={96} className="rounded-full bg-mist" />
        )}
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Author</p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight md:text-5xl">{author.name}</h1>
          {author.bio && <p className="mt-3 max-w-xl text-muted-foreground">{author.bio}</p>}
        </div>
      </div>

      <ul className="mt-12 space-y-12">
        {(posts ?? []).map((p) => (
          <li key={p.id}>
            <Link href={`/${p.slug}`} className="group grid gap-6 md:grid-cols-[1fr_280px]">
              <div>
                <h2 className="font-display text-2xl font-bold leading-snug group-hover:underline underline-offset-4">
                  {p.title}
                </h2>
                <p className="mt-2 line-clamp-2 text-muted-foreground">{p.excerpt}</p>
                <p className="mt-3 text-sm text-muted-foreground">
                  {p.published_at && formatDate(p.published_at)} · {p.reading_time} min read
                </p>
              </div>
              {p.featured_image && (
                <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-mist">
                  <Image src={p.featured_image} alt={featuredImageAlt(p.title, p.excerpt)} fill sizes="280px" className="object-cover" />
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
