import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MediaLibrary } from "./library";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/cms/media");

  const { data: media } = await supabase
    .from("media")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-ink tracking-tight">Media Library</h1>
        <p className="text-sm text-ink-muted mt-1">
          Upload, organize, and manage images used across posts.
        </p>
      </div>

      <MediaLibrary initialMedia={media ?? []} />
    </div>
  );
}
