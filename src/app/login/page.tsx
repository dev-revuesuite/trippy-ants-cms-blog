import Link from 'next/link';
import { resolveLoginErrorMessage } from '@/lib/login-errors';
import { MAIN_SITE_URL, SITE_SHORT_NAME } from '@/lib/site';
import { LoginForm } from './login-form';

export const metadata = { title: 'Sign in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; message?: string; next?: string }>;
}) {
  const sp = await searchParams;
  const errorMessage = resolveLoginErrorMessage(sp.code);

  return (
    <main className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden bg-ink p-12 text-white md:flex md:flex-col md:justify-between">
        <Link href="/" className="font-display text-2xl tracking-tight">{SITE_SHORT_NAME}</Link>
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/60">CMS</p>
          <h2 className="mt-3 font-display text-4xl leading-tight">
            Write things<br />worth reading.
          </h2>
          <p className="mt-4 max-w-sm text-white/70">
            The editorial workspace for Trippy Ants Design.
          </p>
        </div>
        <div className="absolute right-12 top-12 h-24 w-24 rounded-full bg-highlight opacity-90" />
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-2xl tracking-tight">Sign in to Trippy Ants CMS</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Admin access only. Sign in with your authorized account.
          </p>

          {errorMessage && (
            <div className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {errorMessage}
            </div>
          )}
          {sp.message && (
            <div className="mt-6 rounded-md border border-brand/30 bg-brand/10 p-3 text-sm text-brand">
              {sp.message}
            </div>
          )}

          <LoginForm next={sp.next} />

          <p className="mt-6 text-xs text-muted-foreground">
            <a className="underline" href={MAIN_SITE_URL} target="_blank" rel="noopener noreferrer">
              Back to trippyants.com
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
