import Link from 'next/link';
import { BrandMark } from '@/components/site/brand-mark';
import { CONTACT_EMAIL, MAIN_SITE_URL, SITE_NAME } from '@/lib/site';

export function SiteFooter() {
  return (
    <footer className="border-t border-mist">
      <div className="mx-auto max-w-[1200px] px-7 py-7">
        <div className="flex flex-col items-start justify-between gap-4 text-xs text-stone sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <BrandMark size="sm" />
            <span>© {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</span>
          </div>
          <div className="flex flex-wrap gap-[18px]">
            <a href={MAIN_SITE_URL} className="hover:text-ink">Home</a>
            <a href={`${MAIN_SITE_URL}/work`} className="hover:text-ink">Work</a>
            <a href={`${MAIN_SITE_URL}/#connect`} className="hover:text-ink">Connect</a>
            <Link href="/sitemap.xml" className="hover:text-ink">Sitemap</Link>
            <Link href="/rss.xml" className="hover:text-ink">RSS</Link>
          </div>
        </div>
        <p className="mt-4 text-xs text-stone">
          Jaipur, Rajasthan —{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-ink">
            {CONTACT_EMAIL}
          </a>
        </p>
      </div>
    </footer>
  );
}
