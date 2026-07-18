"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import slugify from "slugify";
import { createClient } from "@/lib/supabase/server";

const CategorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required").max(80),
  slug: z.string().optional(),
  description: z.string().max(300).optional().nullable(),
});

function slugifyName(name: string) {
  return slugify(name, { lower: true, strict: true, trim: true });
}

export async function saveCategory(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = CategorySchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    slug: formData.get("slug") || undefined,
    description: formData.get("description") || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { id, name, description } = parsed.data;
  const slug = parsed.data.slug ? slugifyName(parsed.data.slug) : slugifyName(name);

  if (id) {
    const { error } = await supabase
      .from("categories")
      .update({ name, slug, description })
      .eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("categories")
      .insert({ name, slug, description });
    if (error) return { error: error.message };
  }

  revalidatePath("/cms/categories");
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
  revalidateTag("categories");
  return { success: true };
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/cms/categories");
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
  revalidateTag("categories");
  return { success: true };
}
