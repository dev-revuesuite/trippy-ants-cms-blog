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
  const { data: tag } = await supabase.from('tags').select('*').eq('slug', slug).single();
  if (!tag) return {};
  return buildMetadata({
    title: `#${tag.name} — ${BLOG_TITLE}`,
    description: `Posts tagged ${tag.name}`,
    path: `/tag/${tag.slug}`,
  });
}

export default async function TagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: tag } = await supabase.from('tags').select('*').eq('slug', slug).single();
  if (!tag) notFound();

  const { data: rows } = await supabase
    .from('post_tags')
    .select('posts(id,title,slug,excerpt,featured_image,published_at,reading_time,status)')
    .eq('tag_id', tag.id);

  const posts = (rows ?? [])
    .map((r: any) => r.posts)
    .filter(
      (p: any) =>
        p &&
        p.status === 'published' &&
        p.published_at &&
        new Date(p.published_at) <= new Date(),
    );

  return (
    <section className="container max-w-4xl py-16 md:py-24">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Tag</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight md:text-5xl">#{tag.name}</h1>

      <ul className="mt-12 space-y-12 border-t border-border pt-12">
        {posts.map((p: any) => (
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
