# Trippy Ants CMS & Blog

Content platform for [Trippy Ants Design](https://www.trippyants.com) — full CMS, public blog at `/blog`, and SEO infrastructure. Built on the same blueprint as the Revue blog CMS.

> **Stack** · Next.js 15 · TypeScript · Tailwind · TipTap · Supabase · Vercel

The blog is configured with `basePath: '/blog'` so it mounts at `https://www.trippyants.com/blog` alongside the Wix marketing site.

---

## Quick start

```bash
cd trippy-ants-cms
cp .env.example .env.local
# Fill Supabase keys + NEXT_PUBLIC_SITE_URL=http://localhost:3000/blog

npm install
npm run dev
```

- Public blog: `http://localhost:3000/blog`
- CMS login: `http://localhost:3000/blog/login` → `/blog/cms`

Full Supabase setup → [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md)

---

## What's included

- **Public blog** — listing, articles, tags, authors, search, RSS, sitemap
- **CMS dashboard** — posts, TipTap editor, categories, tags, media library, settings
- **SEO** — JSON-LD, OG tags, canonical URLs, reading time
- **Auth** — single-admin CMS via `ALLOWED_CMS_EMAIL` + Supabase Auth

AI automation (Google Sheets → Gemini pipeline) will be added in a later phase.

---

## Project structure

```
trippy-ants-cms/
├── supabase/
│   ├── schema.sql       # Tables, RLS, search index
│   └── seed.sql         # Empty by default
├── src/
│   ├── app/
│   │   ├── (public)/    # Blog pages (served at /blog/*)
│   │   ├── cms/         # Admin dashboard
│   │   └── login/
│   ├── components/
│   └── lib/
└── docs/DEPLOYMENT.md
```

---

## License

Proprietary © Trippy Ants Design LLP.
