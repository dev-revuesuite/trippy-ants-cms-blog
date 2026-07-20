import 'server-only';
import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import { slugify } from '@/lib/utils';
import type { SheetRow, GeneratedArticle } from './types';

const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash-lite';
const GENERATION_TIMEOUT_MS = 48_000;
const IN_CALL_RETRIES = 2;
const MAX_OUTPUT_TOKENS = 8192;

const META_TITLE_MAX = 60;
const META_DESC_MAX = 160;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
  return new GoogleGenAI({ apiKey });
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    slug: { type: Type.STRING },
    excerpt: { type: Type.STRING },
    content_html: { type: Type.STRING },
    meta_title: { type: Type.STRING },
    meta_description: { type: Type.STRING },
    focus_keyword: { type: Type.STRING },
    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
    faqs: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          answer: { type: Type.STRING },
        },
        required: ['question', 'answer'],
        propertyOrdering: ['question', 'answer'],
      },
    },
  },
  required: [
    'title', 'slug', 'excerpt', 'content_html', 'meta_title',
    'meta_description', 'focus_keyword', 'tags', 'faqs',
  ],
  propertyOrdering: [
    'title', 'slug', 'excerpt', 'content_html', 'meta_title',
    'meta_description', 'focus_keyword', 'tags', 'faqs',
  ],
};

const ArticleSchema = z.object({
  title: z.string().trim().min(1),
  slug: z.string().trim().optional().default(''),
  excerpt: z.string().trim().min(1),
  content_html: z.string().trim().min(1),
  meta_title: z.string().trim().optional().default(''),
  meta_description: z.string().trim().optional().default(''),
  focus_keyword: z.string().trim().optional().default(''),
  tags: z.array(z.string().trim()).optional().default([]),
  faqs: z
    .array(z.object({ question: z.string().trim(), answer: z.string().trim() }))
    .optional()
    .default([]),
});

const SYSTEM_INSTRUCTION = [
  'You are an SEO Content Writer for Trippy Ants (https://www.trippyants.com),',
  'a design and product development studio based in Jaipur, India.',
  'Services: Brand Identity, Brand Strategy, Graphic Design, Illustration, Packaging Design,',
  'Brand Communication, Social Media Design, Magazine & Publication Design, UI/UX Design,',
  'Website Design & Development, CRM & Custom Software Development.',
  'Write for business owners, founders, marketers and product managers.',
  'Use simple, natural English. No fluff or AI clichés. Active voice. No invented statistics.',
  'Return valid JSON matching the requested schema.',
].join(' ');

function buildPrompt(topic: string): string {
  return [
    'Create an original, SEO-optimized article that satisfies Google Helpful Content and E-E-A-T guidelines.',
    '',
    `## Topic`,
    topic,
    '',
    'Requirements:',
    '- Match the user search intent for this topic.',
    '- Write for business owners, founders, marketers and product managers.',
    '- Use simple, natural English. No fluff or AI clichés. Active voice.',
    '- Avoid keyword stuffing. Include practical examples where relevant.',
    '',
    'Before writing, silently identify: Primary Keyword, Secondary Keywords, Semantic Keywords,',
    'Related Entities, and Long-tail keyword opportunities. Weave them naturally throughout.',
    '',
    'SEO Rules:',
    '- Naturally use the primary keyword in the Title, H1 (page title field), Introduction, one H2, and Conclusion.',
    '- Include semantic keywords throughout.',
    '- Optimize for Featured Snippets and People Also Ask.',
    '- Write unique, factually accurate content. Do not invent statistics or references.',
    '',
    'Article structure (in content_html as semantic HTML):',
    '1. Introduction — answer the query immediately (start with <p>, no <h1> in body)',
    '2. Well-structured body using <h2> and <h3>',
    '3. Bullet points, tables or checklists where useful (<ul>, <ol>, <table>)',
    '4. FAQ section with 8–10 questions as <h2>Frequently Asked Questions</h2> followed by Q&A',
    '5. Conclusion with a subtle CTA for Trippy Ants (link to https://www.trippyants.com where natural)',
    '',
    'Technical output (JSON fields):',
    '- title: compelling H1 / headline',
    '- slug: short, lowercase, hyphenated URL slug',
    '- excerpt: one-sentence summary',
    '- content_html: full article body as semantic HTML ONLY using:',
    '  <h2> <h3> <p> <ul> <ol> <li> <blockquote> <strong> <em> <a> <table> <thead> <tbody> <tr> <th> <td>',
    '  Do NOT include <h1>, <html>, <head>, <body>, <img>, <script>, <style>, or inline styles.',
    '- meta_title: ≤60 characters',
    '- meta_description: ≤160 characters',
    '- focus_keyword: primary keyword phrase',
    '- tags: 3–6 relevant tags',
    '- faqs: 8–10 Q&A pairs (also reflected in content_html FAQ section)',
    '',
    'Target length: 1500–2500 words in content_html.',
    'Return strictly the JSON object matching the schema.',
  ].join('\n');
}

function clamp(value: string, max: number): string {
  const v = value.trim();
  return v.length > max ? v.slice(0, max).trimEnd() : v;
}

function normalize(row: SheetRow, parsed: z.infer<typeof ArticleSchema>): GeneratedArticle {
  const title = parsed.title || row.title;
  const slug = slugify(parsed.slug || title);
  const tags = Array.from(
    new Set(parsed.tags.map((t) => t.trim()).filter(Boolean)),
  ).slice(0, 8);

  return {
    title,
    slug,
    excerpt: parsed.excerpt,
    content_html: parsed.content_html,
    meta_title: clamp(parsed.meta_title || title, META_TITLE_MAX),
    meta_description: clamp(parsed.meta_description || parsed.excerpt, META_DESC_MAX),
    focus_keyword: parsed.focus_keyword || '',
    tags,
    faqs: parsed.faqs.filter((f) => f.question && f.answer).slice(0, 10),
  };
}

async function callGemini(row: SheetRow): Promise<GeneratedArticle> {
  const ai = getClient();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: buildPrompt(row.title),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.7,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        abortSignal: controller.signal,
      },
    });

    const text = response.text;
    if (!text) throw new Error('Empty response from Gemini');

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error('Gemini returned invalid JSON');
    }

    const parsed = ArticleSchema.parse(json);
    return normalize(row, parsed);
  } finally {
    clearTimeout(timer);
  }
}

export async function generateArticle(row: SheetRow): Promise<GeneratedArticle> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= IN_CALL_RETRIES + 1; attempt++) {
    try {
      return await callGemini(row);
    } catch (err) {
      lastError = err;
      if (attempt <= IN_CALL_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }
  throw new Error(
    `Article generation failed after ${IN_CALL_RETRIES + 1} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}
