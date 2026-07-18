import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { CategoriesManager } from "./manager";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/cms/categories");

  const { data: categories } = await supabase
    .from("categories")
    .select("*, posts:posts(count)")
    .order("name");

  const enriched = (categories ?? []).map((c) => ({
    ...c,
    post_count: Array.isArray(c.posts) ? c.posts[0]?.count ?? 0 : 0,
  }));

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="font-serif text-3xl text-ink tracking-tight">Categories</h1>
        <p className="text-sm text-ink-muted mt-1">
          Organize posts into broad topics. Each post belongs to exactly one category.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <CategoriesManager categories={enriched} />
        </CardContent>
      </Card>
    </div>
  );
}
