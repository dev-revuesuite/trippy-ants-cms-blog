import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ReadingProgress } from "@/components/site/reading-progress";
import { TableOfContents } from "@/components/site/toc";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PostPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/cms/posts/${id}/preview`);

  const { data: post } = await supabase
    .from("posts")
    .select(
      `*,
      author:authors(*),
      category:categories(*)
    `
    )
    .eq("id", id)
    .single();

  if (!post) notFound();

  return (
    <div className="min-h-screen bg-paper">
      <ReadingProgress />

      {/* Preview banner */}
      <div className="sticky top-0 z-50 bg-highlight text-ink">
        <div className="container mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4" />
            <span>Preview mode — this article is {post.status}</span>
          </div>
          <Link
            href={`/cms/posts/${id}/edit`}
            className="text-sm font-medium hover:underline inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to editor
          </Link>
        </div>
      </div>

      <article className="container mx-auto px-4 py-12 md:py-20">
        {/* Masthead */}
        <header className="mx-auto max-w-3xl text-center mb-12">
          {post.category && (
            <Link
              href={`/?category=${post.category.slug}`}
              className="inline-block text-xs uppercase tracking-[0.18em] font-semibold text-brand mb-6"
            >
              {post.category.name}
            </Link>
          )}
          <h1 className="font-serif text-display-2 md:text-display-1 text-ink leading-[1.05] tracking-tight mb-6">
            {post.title || "Untitled draft"}
          </h1>
          {post.excerpt && (
            <p className="text-lg md:text-xl text-ink-muted leading-relaxed max-w-2xl mx-auto">
              {post.excerpt}
            </p>
          )}
          <div className="mt-8 flex items-center justify-center gap-3 text-sm text-ink-muted">
            {post.author && (
              <>
                <span className="font-medium text-ink">{post.author.name}</span>
                <span>·</span>
              </>
            )}
            <time>
              {post.published_at ? formatDate(post.published_at) : "Not published"}
            </time>
            {post.reading_time ? (
              <>
                <span>·</span>
                <span>{post.reading_time} min read</span>
              </>
            ) : null}
          </div>
        </header>

        {/* Featured image */}
        {post.featured_image && (
          <div className="mx-auto max-w-4xl mb-12 md:mb-16">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.featured_image}
              alt={post.title}
              className="w-full h-auto rounded-lg"
            />
          </div>
        )}

        {/* Body */}
        <div className="mx-auto max-w-3xl lg:grid lg:grid-cols-[1fr_220px] lg:gap-12">
          <div
            id="article-content"
            className="prose-article"
            dangerouslySetInnerHTML={{ __html: post.content_html || "<p><em>No content yet.</em></p>" }}
          />
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <TableOfContents />
            </div>
          </aside>
        </div>
      </article>
    </div>
  );
}
