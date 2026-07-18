import { cn } from '@/lib/cn';

export function BrandMark({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'h-[18px] w-[18px] text-[9px] rounded' : 'h-6 w-6 text-[11px] rounded-md';
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center bg-ink font-semibold uppercase tracking-tighter text-paper',
        dim,
        className,
      )}
      aria-hidden
    >
      TA
    </span>
  );
}

export function AuthorAvatar({
  name,
  className,
}: {
  name?: string | null;
  className?: string;
}) {
  const initials = (name || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className={cn(
        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mist text-[11px] font-medium text-[#444441]',
        className,
      )}
    >
      {initials}
    </span>
  );
}
