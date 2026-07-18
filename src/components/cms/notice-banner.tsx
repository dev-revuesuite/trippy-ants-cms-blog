'use client';

import { useRouter, usePathname } from 'next/navigation';
import { CheckCircle2, X } from 'lucide-react';

const MESSAGES: Record<string, (title?: string) => string> = {
  published: (title) =>
    title ? `"${title}" is live on the blog.` : 'Your post is now published.',
  saved: () => 'Draft saved successfully.',
  draft: (title) =>
    title ? `"${title}" saved as draft.` : 'Post saved as draft.',
};

export function CmsNoticeBanner({
  notice,
  title,
}: {
  notice?: string;
  title?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  if (!notice || !(notice in MESSAGES)) return null;

  const message = MESSAGES[notice](title);

  const dismiss = () => {
    router.replace(pathname);
  };

  return (
    <div
      role="status"
      className="mb-6 flex items-start justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900"
    >
      <div className="flex items-start gap-2">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden />
        <span>{message}</span>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="rounded p-0.5 text-green-700 hover:bg-green-100"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
