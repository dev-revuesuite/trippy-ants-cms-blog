import { redirect } from 'next/navigation';
import { getAllowedCmsEmail, isAllowedCmsEmail } from '@/lib/cms-auth';
import { loginErrorPath } from '@/lib/login-errors';
import { createClient } from '@/lib/supabase/server';
import { CmsSidebar } from '@/components/cms/sidebar';

export default async function CmsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  if (!getAllowedCmsEmail()) {
    await supabase.auth.signOut();
    redirect(loginErrorPath('not_configured'));
  }

  if (!isAllowedCmsEmail(user.email)) {
    await supabase.auth.signOut();
    redirect(loginErrorPath('access_denied'));
  }

  const { data: profile } = await supabase
    .from('users')
    .select('email,full_name,role')
    .eq('id', user.id)
    .single();

  const [
    { count: posts },
    { count: categories },
    { count: tags },
  ] = await Promise.all([
    supabase.from('posts').select('id', { count: 'exact', head: true }),
    supabase.from('categories').select('id', { count: 'exact', head: true }),
    supabase.from('tags').select('id', { count: 'exact', head: true }),
  ]);

  return (
    <div className="flex min-h-screen bg-journal text-ink">
      <CmsSidebar
        userName={profile?.full_name ?? null}
        userEmail={profile?.email ?? user.email ?? null}
        userRole={profile?.role ?? null}
        counts={{
          posts: posts ?? 0,
          categories: categories ?? 0,
          tags: tags ?? 0,
        }}
      />
      <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
