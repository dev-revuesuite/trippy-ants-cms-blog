import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SettingsForm } from "./form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/cms/settings");

  // Restrict to admins (gracefully degrade if role missing)
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin";

  const { data: settings } = await supabase.from("settings").select("*").maybeSingle();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-serif text-3xl text-ink tracking-tight">Settings</h1>
        <p className="text-sm text-ink-muted mt-1">
          Global defaults for site identity, SEO, and social profiles.
        </p>
      </div>

      {!isAdmin && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-6 text-sm text-amber-900">
            Read-only view. Only admins can modify settings.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Site identity</CardTitle>
          <CardDescription>Branding shown across the blog and feeds.</CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm settings={settings ?? null} disabled={!isAdmin} />
        </CardContent>
      </Card>
    </div>
  );
}
