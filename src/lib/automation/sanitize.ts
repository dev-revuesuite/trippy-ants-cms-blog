import 'server-only';
import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [
  'h2', 'h3', 'p', 'ul', 'ol', 'li', 'blockquote',
  'strong', 'em', 'b', 'i', 'a',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'code', 'pre', 'br', 'hr',
];

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ['href', 'title'],
    th: ['colspan', 'rowspan', 'scope'],
    td: ['colspan', 'rowspan'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesAppliedToAttributes: ['href'],
  disallowedTagsMode: 'discard',
  transformTags: {
    h1: sanitizeHtml.simpleTransform('h2', {}),
    h4: sanitizeHtml.simpleTransform('h3', {}),
    h5: sanitizeHtml.simpleTransform('h3', {}),
    h6: sanitizeHtml.simpleTransform('h3', {}),
    a: (tagName, attribs) => {
      const href = attribs.href ?? '';
      const isExternal = /^https?:\/\//i.test(href);
      return {
        tagName: 'a',
        attribs: isExternal
          ? { ...attribs, target: '_blank', rel: 'nofollow noopener noreferrer' }
          : attribs,
      };
    },
  },
};

export function sanitizeArticleHtml(dirty: string | null | undefined): string {
  if (!dirty) return '';
  return sanitizeHtml(dirty, OPTIONS).trim();
}

export function hasMeaningfulContent(cleanHtml: string, minChars = 200): boolean {
  const text = cleanHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length >= minChars;
}
