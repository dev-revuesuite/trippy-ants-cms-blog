'use client';

import type { ComponentType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FileText, FolderTree, Tags, Image as ImageIcon, Settings, Plus,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { BrandMark } from '@/components/site/brand-mark';
import { SignOutButton } from '@/components/cms/sign-out-button';

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  count?: number;
  section?: string;
  exact?: boolean;
};

export function CmsSidebar({
  userName,
  userEmail,
  userRole,
  counts,
}: {
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
  counts: { posts: number; categories: number; tags: number };
}) {
  const pathname = usePathname();

  const nav: NavItem[] = [
    { href: '/cms', label: 'Dashboard', icon: LayoutDashboard, exact: true, section: 'Workspace' },
    { href: '/cms/posts', label: 'Posts', icon: FileText, count: counts.posts },
    { href: '/cms/categories', label: 'Categories', icon: FolderTree, count: counts.categories },
    { href: '/cms/tags', label: 'Tags', icon: Tags, count: counts.tags },
    { href: '/cms/media', label: 'Media', icon: ImageIcon },
    { href: '/cms/settings', label: 'Settings', icon: Settings, section: 'Configure' },
  ];

  const isActive = (item: NavItem) => {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  const initials = (userName || userEmail || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  let lastSection: string | undefined;

  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-mist bg-paper py-5 pl-3.5 pr-3.5">
      <div className="flex items-center gap-2 px-2.5 pb-[18px] pt-1.5">
        <BrandMark />
        <span className="text-sm font-medium">Trippy Ants CMS</span>
      </div>

      <Link
        href="/cms/posts/new"
        className="mb-[18px] flex items-center justify-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        New post
      </Link>

      <nav className="flex-1">
        {nav.map((item) => {
          const showSection = item.section && item.section !== lastSection;
          if (item.section) lastSection = item.section;
          return (
            <div key={item.href}>
              {showSection && (
                <p className="px-2.5 pb-1.5 pt-3 text-[10px] font-medium uppercase tracking-[0.14em] text-[#a8a8a0]">
                  {item.section}
                </p>
              )}
              <Link
                href={item.href}
                className={cn(
                  'mb-px flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] text-slate transition-colors',
                  isActive(item) ? 'bg-mist font-medium text-ink' : 'hover:bg-warm',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                {item.label}
                {item.count != null && item.count > 0 && (
                  <span className="ml-auto rounded-full bg-warm px-1.5 text-[11px] text-stone">
                    {item.count}
                  </span>
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-2.5 rounded-lg border border-mist p-2.5">
        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-medium text-white">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{userName || userEmail}</p>
          <p className="text-[10px] capitalize text-stone">{userRole || 'admin'}</p>
        </div>
        <SignOutButton />
      </div>
    </aside>
  );
}
