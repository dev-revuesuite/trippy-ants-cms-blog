"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import slugify from "slugify";
import { createClient } from "@/lib/supabase/server";

const TagSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(60),
  slug: z.string().optional(),
});

function slugifyName(name: string) {
  return slugify(name, { lower: true, strict: true, trim: true });
}

export async function saveTag(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = TagSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    slug: formData.get("slug") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { id, name } = parsed.data;
  const slug = parsed.data.slug ? slugifyName(parsed.data.slug) : slugifyName(name);

  if (id) {
    const { error } = await supabase.from("tags").update({ name, slug }).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("tags").insert({ name, slug });
    if (error) return { error: error.message };
  }

  revalidatePath("/cms/tags");
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
  return { success: true };
}

export async function deleteTag(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("tags").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/cms/tags");
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
  return { success: true };
}
