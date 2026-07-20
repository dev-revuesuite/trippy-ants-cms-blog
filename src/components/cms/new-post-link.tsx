'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';

const variants = {
  sidebar:
    'mb-[18px] flex items-center justify-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-70',
  toolbar:
    'inline-flex items-center gap-1 rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:pointer-events-none disabled:opacity-70',
};

export function NewPostLink({
  variant = 'sidebar',
  className,
}: {
  variant?: keyof typeof variants;
  className?: string;
}) {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  // Sidebar stays mounted across navigations — reset when route settles.
  useEffect(() => {
    setLoading(false);
  }, [pathname]);

  return (
    <Link
      href="/cms/posts/new"
      onClick={() => setLoading(true)}
      aria-busy={loading}
      className={cn(variants[variant], className)}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : (
        <Plus className="h-3.5 w-3.5" aria-hidden />
      )}
      {loading ? 'Opening…' : 'New post'}
    </Link>
  );
}
