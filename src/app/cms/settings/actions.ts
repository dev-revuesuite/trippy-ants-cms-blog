"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const SettingsSchema = z.object({
  site_title: z.string().max(120).optional().nullable(),
  site_description: z.string().max(300).optional().nullable(),
  default_og_image: z.string().url().optional().nullable().or(z.literal("")),
  twitter_handle: z.string().max(50).optional().nullable(),
  linkedin_url: z.string().url().optional().nullable().or(z.literal("")),
  default_meta_title: z.string().max(70).optional().nullable(),
  default_meta_description: z.string().max(160).optional().nullable(),
});

export async function saveSettings(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const raw = {
    site_title: formData.get("site_title")?.toString() || null,
    site_description: formData.get("site_description")?.toString() || null,
    default_og_image: formData.get("default_og_image")?.toString() || null,
    twitter_handle: formData.get("twitter_handle")?.toString() || null,
    linkedin_url: formData.get("linkedin_url")?.toString() || null,
    default_meta_title: formData.get("default_meta_title")?.toString() || null,
    default_meta_description: formData.get("default_meta_description")?.toString() || null,
  };

  const parsed = SettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Settings is a singleton row with id=1
  const { data: existing } = await supabase.from("settings").select("id").maybeSingle();

  const payload = {
    ...parsed.data,
    default_og_image: parsed.data.default_og_image || null,
    linkedin_url: parsed.data.linkedin_url || null,
  };

  if (existing) {
    const { error } = await supabase.from("settings").update(payload).eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("settings").insert(payload);
    if (error) return { error: error.message };
  }

  revalidatePath("/cms/settings");
  revalidatePath("/", "layout");
  return { success: true };
}
