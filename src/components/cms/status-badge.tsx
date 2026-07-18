import { cn } from '@/lib/cn';

const styles: Record<string, string> = {
  published: 'bg-[#EAF3DE] text-[#3B6D11]',
  draft: 'bg-[#F1EFE8] text-[#5F5E5A]',
  scheduled: 'bg-[#FAEEDA] text-[#854F0B]',
  archived: 'bg-mist text-muted-foreground',
};

export function StatusBadge({ status }: { status: string }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
        styles[status] ?? styles.draft,
      )}
    >
      <span className="h-[5px] w-[5px] rounded-full bg-current" aria-hidden />
      {label}
    </span>
  );
}
