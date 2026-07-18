'use client';

import { useEffect, useState } from 'react';

interface TocItem { id: string; text: string; level: number }

export function TableOfContents() {
  const [items, setItems] = useState<TocItem[]>([]);
  const [active, setActive] = useState<string>('');

  useEffect(() => {
    const article = document.getElementById('article-content');
    if (!article) return;

    const headings = Array.from(article.querySelectorAll('h2, h3'));
    const toc: TocItem[] = headings.map((h, idx) => {
      const text = h.textContent || '';
      const id = h.id || text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `heading-${idx}`;
      h.id = id;
      return { id, text, level: parseInt(h.tagName[1], 10) };
    });
    setItems(toc);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length) setActive(visible[0].target.id);
      },
      { rootMargin: '-15% 0px -75% 0px' }
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, []);

  if (items.length < 2) return null;

  return (
    <nav className="sticky top-24">
      <p className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
        In this article
      </p>
      <ul className="space-y-2 border-l border-border">
        {items.map((it) => (
          <li key={it.id} className={it.level === 3 ? 'ml-3' : ''}>
            <a
              href={`#${it.id}`}
              className={`block border-l-2 pl-3 text-sm transition-colors -ml-px ${
                active === it.id
                  ? 'border-brand text-brand font-medium'
                  : 'border-transparent text-muted-foreground hover:text-ink'
              }`}
            >
              {it.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
