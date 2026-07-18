'use client';

import { PUBLIC_BLOG_PREFIX } from '@/lib/site';

import { useState, useTransition, useEffect } from 'react';
import { TiptapEditor } from '@/components/editor/tiptap';
import { Input, Textarea, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { savePost } from '../../actions';
/** Client-safe slug (do not import `slugify` npm package in client components). */
function toSlug(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
import { Trash2, Plus, ImagePlus, Eye, Loader2 } from 'lucide-react';
import { uploadMediaFile } from '@/app/cms/media/actions';
import { validateImageFile } from '@/lib/upload-limits';
import Link from 'next/link';
import type { Post, Category, Tag, Author } from '@/lib/supabase/database.types';

interface Props {
  post: Partial<Post> & { id?: string };
  categories: Category[];
  tags: Tag[];
  authors: Author[];
  selectedTagIds: string[];
}

export function PostEditor({ post, categories, tags, authors, selectedTagIds: initialTagIds }: Props) {
  const [title, setTitle] = useState(post.title || '');
  const [slug, setSlug] = useState(post.slug || '');
  const [slugTouched, setSlugTouched] = useState(!!post.slug);
  const [excerpt, setExcerpt] = useState(post.excerpt || '');
  const [contentJson, setContentJson] = useState<any>(post.content_json || null);
  const [contentHtml, setContentHtml] = useState(post.content_html || '');
  const [featuredImage, setFeaturedImage] = useState(post.featured_image || '');
  const [status, setStatus] = useState<string>(post.status || 'draft');
  const [publishedAt, setPublishedAt] = useState(
    post.published_at ? new Date(post.published_at).toISOString().slice(0, 16) : ''
  );
  const [authorId, setAuthorId] = useState(post.author_id || '');
  const [categoryId, setCategoryId] = useState(post.category_id || '');
  const [tagIds, setTagIds] = useState<string[]>(initialTagIds);

  // SEO
  const [metaTitle, setMetaTitle] = useState(post.meta_title || '');
  const [metaDescription, setMetaDescription] = useState(post.meta_description || '');
  const [focusKeyword, setFocusKeyword] = useState(post.focus_keyword || '');
  const [canonicalUrl, setCanonicalUrl] = useState(post.canonical_url || '');
  const [ogImage, setOgImage] = useState(post.og_image || '');
  const [robots, setRobots] = useState(post.robots || 'index,follow');
  const [schemaType, setSchemaType] = useState(post.schema_type || 'Article');

  // FAQs
  const [faqs, setFaqs] = useState<Array<{ question: string; answer: string }>>(
    Array.isArray(post.faqs) ? post.faqs : []
  );

  const [isPending, start] = useTransition();
  const [pendingAction, setPendingAction] = useState<'draft' | 'publish' | null>(null);
  const [tab, setTab] = useState<'content' | 'seo' | 'faqs' | 'settings'>('content');

  const [uploading, setUploading] = useState<'cover' | 'og' | null>(null);
  const [uploadError, setUploadError] = useState<{ kind: 'cover' | 'og'; message: string } | null>(null);

  // Auto-slug from title until manually edited
  useEffect(() => {
    if (!slugTouched && title) setSlug(toSlug(title));
  }, [title, slugTouched]);

  const onUpload = (kind: 'cover' | 'og', cb: (url: string) => void) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const validationError = validateImageFile(file);
      if (validationError) {
        setUploadError({ kind, message: validationError });
        return;
      }

      setUploading(kind);
      setUploadError(null);
      try {
        const fd = new FormData();
        fd.set('file', file);
        const res = await uploadMediaFile(fd);
        if (res.error) {
          setUploadError({ kind, message: res.error });
          return;
        }
        if (res.row?.url) cb(res.row.url);
      } catch {
        setUploadError({
          kind,
          message: 'Upload failed — network error or session expired. Refresh the page and try again.',
        });
      } finally {
        setUploading(null);
      }
    };
    input.click();
  };

  const submit = (overrideStatus?: string) => {
    const nextStatus = overrideStatus || status;
    setPendingAction(nextStatus === 'published' ? 'publish' : 'draft');

    const fd = new FormData();
    if (post.id) fd.set('id', post.id);
    fd.set('title', title);
    fd.set('slug', slug);
    fd.set('excerpt', excerpt);
    fd.set('content_json', JSON.stringify(contentJson));
    fd.set('content_html', contentHtml);
    fd.set('featured_image', featuredImage);
    fd.set('status', nextStatus);
    if (publishedAt) fd.set('published_at', new Date(publishedAt).toISOString());
    fd.set('author_id', authorId);
    fd.set('category_id', categoryId);
    fd.set('tag_ids', JSON.stringify(tagIds));
    fd.set('meta_title', metaTitle);
    fd.set('meta_description', metaDescription);
    fd.set('focus_keyword', focusKeyword);
    fd.set('canonical_url', canonicalUrl);
    fd.set('og_image', ogImage);
    fd.set('robots', robots);
    fd.set('schema_type', schemaType);
    fd.set('faqs', JSON.stringify(faqs));
    start(() => savePost(fd));
  };

  return (
    <div className="grid grid-cols-1 gap-8 p-6 md:p-10 lg:grid-cols-[1fr_360px]">
      {/* MAIN */}
      <div>
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link href="/cms/posts" className="text-sm text-muted-foreground hover:text-ink">
            ← All posts
          </Link>
          <div className="flex gap-2">
            {post.id && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/cms/posts/${post.id}/preview`} target="_blank">
                  <Eye className="h-4 w-4" /> Preview
                </Link>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => submit('draft')}
            >
              {isPending && pendingAction === 'draft' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save draft'
              )}
            </Button>
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => submit('published')}
            >
              {isPending && pendingAction === 'publish' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Publishing…
                </>
              ) : (
                'Publish'
              )}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 border-b border-border">
          {(['content', 'seo', 'faqs', 'settings'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`relative px-4 py-2 text-sm transition-colors ${tab === t ? 'text-ink' : 'text-muted-foreground hover:text-ink'}`}
            >
              {t === 'seo' ? 'SEO' : t === 'faqs' ? 'FAQs' : t[0].toUpperCase() + t.slice(1)}
              {tab === t && <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-ink" />}
            </button>
          ))}
        </div>

        {tab === 'content' && (
          <div className="space-y-6">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="w-full bg-transparent font-display text-4xl font-bold tracking-tight outline-none placeholder:text-mist md:text-5xl"
            />
            <input
              type="text"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="One-sentence summary…"
              className="w-full bg-transparent font-serif text-xl text-muted-foreground outline-none"
            />

            <div className="border-t border-border pt-6">
              <TiptapEditor
                initialContent={contentJson}
                onChange={(json, html) => { setContentJson(json); setContentHtml(html); }}
              />
            </div>
          </div>
        )}

        {tab === 'seo' && (
          <Card>
            <CardContent className="space-y-5 pt-6">
              <div>
                <Label>Slug</Label>
                <Input
                  className="mt-1 font-mono"
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
                />
                <p className="mt-1 text-xs text-muted-foreground">{PUBLIC_BLOG_PREFIX}/{slug || 'your-slug-here'}</p>
              </div>
              <div>
                <Label>Meta title</Label>
                <Input className="mt-1" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} maxLength={70} />
                <p className="mt-1 text-xs text-muted-foreground">{metaTitle.length}/70</p>
              </div>
              <div>
                <Label>Meta description</Label>
                <Textarea className="mt-1" value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} maxLength={160} rows={3} />
                <p className="mt-1 text-xs text-muted-foreground">{metaDescription.length}/160</p>
              </div>
              <div>
                <Label>Focus keyword</Label>
                <Input className="mt-1" value={focusKeyword} onChange={(e) => setFocusKeyword(e.target.value)} />
              </div>
              <div>
                <Label>Canonical URL</Label>
                <Input className="mt-1" value={canonicalUrl} onChange={(e) => setCanonicalUrl(e.target.value)} placeholder="https://…" />
              </div>
              <div>
                <Label>Open Graph image</Label>
                <div className="mt-1 flex gap-2">
                  <Input value={ogImage} onChange={(e) => setOgImage(e.target.value)} placeholder="https://…" />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onUpload('og', setOgImage)}
                    disabled={uploading !== null}
                  >
                    {uploading === 'og' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImagePlus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {uploading === 'og' && (
                  <p className="mt-1 text-xs text-muted-foreground">Uploading…</p>
                )}
                {uploadError?.kind === 'og' && (
                  <p className="mt-1 text-xs text-red-600">
                    Upload failed: {uploadError.message}{' '}
                    <button
                      type="button"
                      onClick={() => setUploadError(null)}
                      className="underline hover:text-red-800"
                    >
                      Dismiss
                    </button>
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Robots</Label>
                  <select
                    value={robots}
                    onChange={(e) => setRobots(e.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    <option>index,follow</option>
                    <option>noindex,follow</option>
                    <option>index,nofollow</option>
                    <option>noindex,nofollow</option>
                  </select>
                </div>
                <div>
                  <Label>Schema type</Label>
                  <select
                    value={schemaType}
                    onChange={(e) => setSchemaType(e.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    <option>Article</option>
                    <option>BlogPosting</option>
                    <option>NewsArticle</option>
                    <option>TechArticle</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {tab === 'faqs' && (
          <Card>
            <CardHeader>
              <CardTitle>FAQ schema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {faqs.map((f, i) => (
                <div key={i} className="rounded-md border border-border p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      FAQ #{i + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => setFaqs(faqs.filter((_, ix) => ix !== i))}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <Input
                    className="mt-3"
                    placeholder="Question"
                    value={f.question}
                    onChange={(e) => {
                      const next = [...faqs]; next[i] = { ...f, question: e.target.value }; setFaqs(next);
                    }}
                  />
                  <Textarea
                    className="mt-2"
                    placeholder="Answer"
                    rows={3}
                    value={f.answer}
                    onChange={(e) => {
                      const next = [...faqs]; next[i] = { ...f, answer: e.target.value }; setFaqs(next);
                    }}
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => setFaqs([...faqs, { question: '', answer: '' }])}
              >
                <Plus className="h-4 w-4" /> Add FAQ
              </Button>
            </CardContent>
          </Card>
        )}

        {tab === 'settings' && (
          <Card>
            <CardContent className="space-y-5 pt-6">
              <div>
                <Label>Status</Label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <Label>Publish date</Label>
                <Input
                  type="datetime-local"
                  className="mt-1"
                  value={publishedAt}
                  onChange={(e) => setPublishedAt(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* SIDEBAR */}
      <aside className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Featured image</CardTitle></CardHeader>
          <CardContent>
            {featuredImage ? (
              <div className="space-y-2">
                <img src={featuredImage} alt="" className="w-full rounded-md object-cover" />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onUpload('cover', setFeaturedImage)}
                    disabled={uploading !== null}
                  >
                    {uploading === 'cover' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                      </>
                    ) : (
                      'Replace'
                    )}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setFeaturedImage('')}>Remove</Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => onUpload('cover', setFeaturedImage)}
                disabled={uploading !== null}
              >
                {uploading === 'cover' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-4 w-4" /> Upload image
                  </>
                )}
              </Button>
            )}
            {uploadError?.kind === 'cover' && (
              <p className="mt-2 text-xs text-red-600">
                Upload failed: {uploadError.message}{' '}
                <button
                  type="button"
                  onClick={() => setUploadError(null)}
                  className="underline hover:text-red-800"
                >
                  Dismiss
                </button>
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Author</CardTitle></CardHeader>
          <CardContent>
            <select value={authorId} onChange={(e) => setAuthorId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm">
              <option value="">— Select author —</option>
              {authors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Category</CardTitle></CardHeader>
          <CardContent>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm">
              <option value="">— Select category —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Tags</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => {
                const checked = tagIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() =>
                      setTagIds(checked ? tagIds.filter((x) => x !== t.id) : [...tagIds, t.id])
                    }
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      checked
                        ? 'border-brand bg-brand text-white'
                        : 'border-border text-muted-foreground hover:bg-mist'
                    }`}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
