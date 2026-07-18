import type { Metadata } from 'next';
import { absoluteUrl } from './utils';
import type { Post, Author, Category } from './supabase/database.types';
import { BLOG_TITLE, CONTACT_EMAIL, MAIN_SITE_URL, SITE_NAME } from './site';

export interface SeoInput {
  title: string;
  description?: string;
  path: string;
  image?: string | null;
  type?: 'website' | 'article';
  publishedTime?: string | null;
  author?: string | null;
  canonical?: string | null;
  robots?: string | null;
  keywords?: string | null;
}

export function buildMetadata(s: SeoInput): Metadata {
  const url = s.canonical || absoluteUrl(s.path);
  const image = s.image || absoluteUrl('/og-default.png');
  const description =
    s.description ||
    'Design stories, branding insights, and creative process from Trippy Ants Design — a multi-disciplinary design studio in Jaipur.';

  return {
    title: s.title,
    description,
    keywords: s.keywords ?? undefined,
    alternates: { canonical: url },
    robots: s.robots ?? 'index,follow',
    openGraph: {
      type: s.type ?? 'website',
      url,
      title: s.title,
      description,
      siteName: SITE_NAME,
      images: [{ url: image, width: 1200, height: 630, alt: s.title }],
      publishedTime: s.publishedTime ?? undefined,
      authors: s.author ? [s.author] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: s.title,
      description,
      images: [image],
    },
  };
}

export function articleJsonLd(post: Post, author?: Author | null, category?: Category | null) {
  return {
    '@context': 'https://schema.org',
    '@type': post.schema_type || 'Article',
    headline: post.title,
    description: post.meta_description || post.excerpt,
    image: post.og_image || post.featured_image,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: author
      ? { '@type': 'Person', name: author.name, url: absoluteUrl(`/author/${author.slug}`) }
      : { '@type': 'Organization', name: SITE_NAME },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: absoluteUrl('/logo.webp') },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(`/${post.slug}`) },
    articleSection: category?.name,
    keywords: post.focus_keyword,
  };
}

export function faqJsonLd(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: MAIN_SITE_URL,
    logo: absoluteUrl('/logo.webp'),
    email: CONTACT_EMAIL,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Jaipur',
      addressRegion: 'Rajasthan',
      addressCountry: 'IN',
    },
  };
}

export { BLOG_TITLE };
