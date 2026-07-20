'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  const [loading, setLoading] = useState(false);

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
