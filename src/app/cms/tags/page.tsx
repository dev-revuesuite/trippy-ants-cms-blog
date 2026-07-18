import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { TagsManager } from "./manager";

export const dynamic = "force-dynamic";

export default async function TagsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/cms/tags");

  const { data: tags } = await supabase
    .from("tags")
    .select("*, post_tags:post_tags(count)")
    .order("name");

  const enriched = (tags ?? []).map((t) => ({
    ...t,
    post_count: Array.isArray(t.post_tags) ? t.post_tags[0]?.count ?? 0 : 0,
  }));

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="font-serif text-3xl text-ink tracking-tight">Tags</h1>
        <p className="text-sm text-ink-muted mt-1">
          Add granular labels to posts. A post can have many tags.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <TagsManager tags={enriched} />
        </CardContent>
      </Card>
    </div>
  );
}
