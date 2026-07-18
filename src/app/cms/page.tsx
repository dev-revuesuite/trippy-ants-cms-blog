import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { StatusBadge } from '@/components/cms/status-badge';
import { formatRelativeTime, firstName } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from('users').select('full_name').eq('id', user.id).single()
    : { data: null };

  const [
    { count: total },
    { count: published },
    { count: drafts },
    { count: scheduled },
    { data: recent },
    { count: staleDrafts },
    { data: nextScheduled },
  ] = await Promise.all([
    supabase.from('posts').select('id', { count: 'exact', head: true }),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'scheduled'),
    supabase
      .from('posts')
      .select('id,title,slug,status,updated_at,published_at,author_id,category_id')
      .order('updated_at', { ascending: false })
      .limit(5),
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'draft')
      .lt('updated_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()),
    supabase
      .from('posts')
      .select('published_at')
      .eq('status', 'scheduled')
      .gt('published_at', new Date().toISOString())
      .order('published_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const authorIds = [...new Set((recent ?? []).map((p) => p.author_id).filter(Boolean))] as string[];
  const categoryIds = [...new Set((recent ?? []).map((p) => p.category_id).filter(Boolean))] as string[];

  const [{ data: authors }, { data: categories }] = await Promise.all([
    authorIds.length
      ? supabase.from('authors').select('id,name').in('id', authorIds)
      : Promise.resolve({ data: [] }),
    categoryIds.length
      ? supabase.from('categories').select('id,name,slug').in('id', categoryIds)
      : Promise.resolve({ data: [] }),
  ]);

  const authorMap = new Map((authors ?? []).map((a: { id: string; name: string }) => [a.id, a.name]));
  const categoryMap = new Map((categories ?? []).map((c: { id: string; name: string; slug: string }) => [c.id, c]));

  const greeting = firstName(profile?.full_name, 'there');
  const nextDate = nextScheduled?.published_at
    ? new Date(nextScheduled.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  const stats = [
    { label: 'Total posts', value: total ?? 0, delta: null as string | null },
    { label: 'Published', value: published ?? 0, delta: null },
    {
      label: 'Drafts',
      value: drafts ?? 0,
      delta: staleDrafts ? `${staleDrafts} stale >14d` : null,
      negative: !!staleDrafts,
    },
    {
      label: 'Scheduled',
      value: scheduled ?? 0,
      delta: nextDate ? `Next: ${nextDate}` : null,
    },
  ];

  const tabs = ['All', 'Drafts', 'Scheduled', 'Published'] as const;

  return (
    <div className="px-8 py-6 md:px-8">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs text-stone">Workspace · Dashboard</p>
          <h1 className="headline-serif mt-1 text-[28px] leading-tight">Good morning, {greeting}</h1>
          <p className="mt-1 text-[13px] text-stone">Here&apos;s what&apos;s happening across the Trippy Ants Journal.</p>
        </div>
        <div className="flex w-full max-w-[240px] items-center gap-2 rounded-lg border border-mist bg-paper px-3 py-1.5 text-[13px] text-stone sm:w-auto">
          <Search className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">Search posts, tags…</span>
        </div>
      </div>

      <div className="mb-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-[10px] border border-mist bg-paper p-4">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-stone">{s.label}</p>
            <p className="text-[26px] font-medium tracking-tight">{s.value}</p>
            {s.delta && (
              <p className={`mt-1 text-[11px] ${'negative' in s && s.negative ? 'text-[#c44545]' : 'text-[#1d9e75]'}`}>
                {s.delta}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-[10px] border border-mist bg-paper">
        <div className="flex flex-col gap-3 border-b border-mist px-[18px] py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-medium">Recent posts</h2>
          <div className="flex flex-wrap gap-1">
            {tabs.map((tab, i) => (
              <span
                key={tab}
                className={`rounded-md px-2.5 py-1 text-xs ${
                  i === 0 ? 'bg-ink text-white' : 'text-stone'
                }`}
              >
                {tab}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-[1fr_110px_130px_100px] gap-4 border-b border-warm bg-journal px-[18px] py-2 text-[10px] font-medium uppercase tracking-[0.08em] text-[#a8a8a0] max-md:hidden">
          <div>Title</div>
          <div>Status</div>
          <div>Author</div>
          <div>Updated</div>
        </div>

        {(recent ?? []).length === 0 ? (
          <p className="px-[18px] py-12 text-center text-sm text-stone">
            No posts yet.{' '}
            <Link href="/cms/posts/new" className="font-medium text-brand underline">
              Write your first one →
            </Link>
          </p>
        ) : (
          (recent ?? []).map((p) => (
            <div
              key={p.id}
              className="grid gap-3 border-b border-warm px-[18px] py-3 last:border-0 max-md:grid-cols-1 md:grid-cols-[1fr_110px_130px_100px] md:items-center md:gap-4"
            >
              <div>
                <Link href={`/cms/posts/${p.id}/edit`} className="text-[13px] font-medium text-ink hover:text-brand">
                  {p.title}
                </Link>
                <p className="mt-0.5 text-[11px] text-stone">
                  {categoryMap.get(p.category_id!)?.name ?? 'Uncategorized'} · /{p.slug}
                </p>
              </div>
              <div>
                <StatusBadge status={p.status} />
              </div>
              <div className="text-[13px] text-stone max-md:hidden">
                {authorMap.get(p.author_id!) ?? '—'}
              </div>
              <div className="text-[13px] text-stone">
                {p.status === 'scheduled' && p.published_at
                  ? new Date(p.published_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : formatRelativeTime(p.updated_at)}
              </div>
            </div>
          ))
        )}
      </div>

      <p className="mt-4 text-center text-xs text-stone md:text-right">
        <Link href="/cms/posts" className="font-medium text-brand hover:underline">
          View all posts →
        </Link>
      </p>
    </div>
  );
}
