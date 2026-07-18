'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { slugify, calcReadingTime } from '@/lib/utils';

const PostSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required'),
  slug: z.string().optional(),
  excerpt: z.string().optional().nullable(),
  content_json: z.any().optional().nullable(),
  content_html: z.string().optional().nullable(),
  featured_image: z.string().url().optional().nullable().or(z.literal('')),
  status: z.enum(['draft', 'scheduled', 'published', 'archived']).default('draft'),
  published_at: z.string().datetime().optional().nullable(),
  author_id: z.string().uuid().optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  tag_ids: z.array(z.string().uuid()).optional(),

  meta_title: z.string().optional().nullable(),
  meta_description: z.string().optional().nullable(),
  focus_keyword: z.string().optional().nullable(),
  canonical_url: z.string().url().optional().nullable().or(z.literal('')),
  og_image: z.string().url().optional().nullable().or(z.literal('')),
  robots: z.string().optional().nullable(),
  schema_type: z.string().optional().nullable(),

  faqs: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
  cta_block: z.any().optional().nullable(),
});

export type PostInput = z.infer<typeof PostSchema>;

/** Create a fresh empty post and route to its editor. */
export async function createPost() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Find or create an author profile for this user
  let { data: author } = await supabase.from('authors').select('id').eq('user_id', user.id).maybeSingle();
  if (!author) {
    const { data: u } = await supabase.from('users').select('full_name,email').eq('id', user.id).single();
    const name = u?.full_name || u?.email?.split('@')[0] || 'Author';
    const { data: created } = await supabase.from('authors').insert({
      user_id: user.id, name, slug: slugify(name + '-' + user.id.slice(0, 6)),
    }).select('id').single();
    author = created;
  }

  const title = 'Untitled';
  const baseSlug = slugify(title + '-' + Date.now().toString(36));

  const { data, error } = await supabase
    .from('posts')
    .insert({ title, slug: baseSlug, status: 'draft', author_id: author?.id ?? null })
    .select('id')
    .single();
  if (error) throw error;
  redirect(`/cms/posts/${data.id}/edit`);
}

/** Save the editor form. */
export async function savePost(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = PostSchema.parse({
    ...raw,
    content_json: raw.content_json ? JSON.parse(raw.content_json as string) : null,
    faqs: raw.faqs ? JSON.parse(raw.faqs as string) : [],
    tag_ids: raw.tag_ids ? JSON.parse(raw.tag_ids as string) : [],
    // normalize empty strings to nulls for nullable fields
    featured_image: raw.featured_image || null,
    canonical_url: raw.canonical_url || null,
    og_image: raw.og_image || null,
    author_id: raw.author_id || null,
    category_id: raw.category_id || null,
    published_at: raw.published_at ? new Date(raw.published_at as string).toISOString() : null,
  });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const slug = parsed.slug?.trim() ? slugify(parsed.slug) : slugify(parsed.title);

  const payload = {
    title: parsed.title,
    slug,
    excerpt: parsed.excerpt,
    content_json: parsed.content_json,
    content_html: parsed.content_html,
    featured_image: parsed.featured_image,
    status: parsed.status,
    published_at: parsed.status === 'published' && !parsed.published_at
      ? new Date().toISOString()
      : parsed.published_at,
    author_id: parsed.author_id,
    category_id: parsed.category_id,
    meta_title: parsed.meta_title,
    meta_description: parsed.meta_description,
    focus_keyword: parsed.focus_keyword,
    canonical_url: parsed.canonical_url,
    og_image: parsed.og_image,
    robots: parsed.robots,
    schema_type: parsed.schema_type,
    faqs: parsed.faqs ?? [],
    cta_block: parsed.cta_block,
    reading_time: calcReadingTime(parsed.content_html),
  };

  if (!parsed.id) {
    const { data, error } = await supabase.from('posts').insert(payload).select('id').single();
    if (error) throw error;
    parsed.id = data.id;
  } else {
    const { error } = await supabase.from('posts').update(payload).eq('id', parsed.id);
    if (error) throw error;

    // Revision snapshot
    await supabase.from('revisions').insert({
      post_id: parsed.id,
      title: parsed.title,
      content_json: parsed.content_json,
      content_html: parsed.content_html,
      edited_by: user.id,
    });
  }

  // Reconcile tags
  if (parsed.tag_ids && parsed.id) {
    await supabase.from('post_tags').delete().eq('post_id', parsed.id);
    if (parsed.tag_ids.length) {
      await supabase.from('post_tags').insert(
        parsed.tag_ids.map((tag_id) => ({ post_id: parsed.id!, tag_id }))
      );
    }
  }

  revalidatePath('/');
  revalidatePath(`/${slug}`);
  revalidatePath('/cms/posts');
  revalidatePath('/sitemap.xml');

  const titleEnc = encodeURIComponent(parsed.title);

  if (parsed.status === 'published') {
    redirect(`/cms/posts?status=published&notice=published&title=${titleEnc}`);
  }

  redirect(`/cms/posts/${parsed.id}/edit?notice=saved`);
}

export async function duplicatePost(id: string) {
  const supabase = await createClient();
  const { data: original } = await supabase.from('posts').select('*').eq('id', id).single();
  if (!original) return;
  const { id: _i, created_at: _c, updated_at: _u, search_vector: _s, view_count: _v, ...rest } = original as any;
  const newSlug = slugify(`${original.slug}-copy-${Date.now().toString(36)}`);
  await supabase.from('posts').insert({
    ...rest,
    title: `${original.title} (copy)`,
    slug: newSlug,
    status: 'draft',
    published_at: null,
  });
  revalidatePath('/cms/posts');
}

export async function deletePost(id: string) {
  const supabase = await createClient();
  const { data: post } = await supabase.from('posts').select('slug').eq('id', id).single();
  await supabase.from('posts').delete().eq('id', id);
  revalidatePath('/cms/posts');
  revalidatePath('/');
  if (post?.slug) revalidatePath(`/${post.slug}`);
  revalidatePath('/sitemap.xml');
}
