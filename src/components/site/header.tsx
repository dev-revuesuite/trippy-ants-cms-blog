import Link from 'next/link';
import { Search } from 'lucide-react';
import { getHeaderCategories } from '@/lib/blog-nav';
import { BrandMark } from '@/components/site/brand-mark';
import { MAIN_SITE_URL, SITE_SHORT_NAME } from '@/lib/site';

export async function SiteHeader() {
  const categories = await getHeaderCategories();

  return (
    <header className="border-b border-mist bg-paper">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-7 py-3.5">
        <div className="flex items-center gap-7">
          <Link href="/" className="flex items-center gap-2.5 text-ink no-underline">
            <BrandMark />
            <span className="font-display text-[15px]">{SITE_SHORT_NAME}</span>
          </Link>
          <nav className="hidden items-center gap-5 text-[13px] text-slate md:flex">
            {categories.map((c) => (
              <Link key={c.slug} href={`/?category=${c.slug}`} className="hover:text-ink">
                {c.name}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/" className="btn-mock-light hidden sm:inline-flex">
            <Search className="mr-1 h-3.5 w-3.5" aria-hidden />
            Search
          </Link>
          <a href={`${MAIN_SITE_URL}/#connect`} className="btn-mock-dark">
            Connect
          </a>
        </div>
      </div>
    </header>
  );
}
