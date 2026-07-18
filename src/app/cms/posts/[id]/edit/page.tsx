import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PostEditor } from "./editor";
import { CmsNoticeBanner } from "@/components/cms/notice-banner";

export const dynamic = "force-dynamic";

export default async function EditPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/cms");

  const { data: post, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !post) notFound();

  const [categoriesRes, tagsRes, authorsRes, postTagsRes] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase.from("tags").select("*").order("name"),
    supabase.from("authors").select("*").order("name"),
    supabase.from("post_tags").select("tag_id").eq("post_id", id),
  ]);

  const selectedTagIds = (postTagsRes.data ?? []).map((r) => r.tag_id);

  return (
    <div className="space-y-6">
      <CmsNoticeBanner notice={sp.notice} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/cms/posts">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to posts
            </Link>
          </Button>
          <div className="h-5 w-px bg-mist" />
          <span className="text-sm text-ink-muted">
            {post.status === "published" ? "Published" : post.status === "scheduled" ? "Scheduled" : "Draft"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/cms/posts/${id}/preview`} target="_blank">
              <Eye className="h-4 w-4 mr-1.5" />
              Preview
            </Link>
          </Button>
          {post.status === "published" && (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/${post.slug}`} target="_blank">
                <ExternalLink className="h-4 w-4 mr-1.5" />
                View live
              </Link>
            </Button>
          )}
        </div>
      </div>

      <PostEditor
        post={post}
        categories={categoriesRes.data ?? []}
        tags={tagsRes.data ?? []}
        authors={authorsRes.data ?? []}
        selectedTagIds={selectedTagIds}
      />
    </div>
  );
}
