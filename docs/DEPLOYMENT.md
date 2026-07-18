# Deployment Guide — Trippy Ants CMS

Production: **Supabase** (database, auth, storage) + **Vercel** (Next.js). The blog lives at `https://www.trippyants.com/blog` via Next.js `basePath`.

---

## 1. Create Supabase project

1. [supabase.com](https://supabase.com) → **New project** (separate from Revue).
2. Copy **Project URL**, **anon key**, and **service_role key** from Settings → API.

## 2. Run schema

SQL Editor → paste and run `supabase/schema.sql`, then `supabase/seed.sql` (empty).

Verify tables: `users`, `authors`, `posts`, `categories`, `tags`, `post_tags`, `revisions`, `media`, `settings`.

## 3. Storage bucket

Storage → **New bucket**: name `media`, **public** enabled.

Policy for authenticated uploads:

```sql
-- Policy: authenticated_upload, INSERT, role authenticated
bucket_id = 'media'
```

## 4. CMS admin user

1. Authentication → **Users** → add admin email + password.
2. Disable public signup: Authentication → Email → turn off “Allow new users to sign up”.
3. Set `ALLOWED_CMS_EMAIL` in `.env.local` / Vercel.
4. Promote to admin in SQL Editor:

```sql
update public.users set role = 'admin' where email = 'your-admin@example.com';
```

## 5. Local development

```bash
cp .env.example .env.local
npm install
npm run dev
```

- Blog: `http://localhost:3000/blog`
- CMS: `http://localhost:3000/blog/login` → `/blog/cms`

Set `NEXT_PUBLIC_SITE_URL=http://localhost:3000/blog` locally.

## 6. Deploy to Vercel

1. Push repo to GitHub.
2. Import in Vercel → Framework: Next.js.
3. Environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL=https://www.trippyants.com/blog`
   - `ALLOWED_CMS_EMAIL`
4. Deploy.

## 7. Connect to Wix (trippyants.com/blog)

The Next.js app uses `basePath: '/blog'`. Connect Vercel to `www.trippyants.com` and configure Wix to route `/blog/*` to Vercel (reverse proxy or subdomain routing — exact steps depend on your Wix plan).

Add a **Blog** link on the Wix site nav → `https://www.trippyants.com/blog`.

## 8. Post-deploy checks

- `https://www.trippyants.com/blog/sitemap.xml`
- `https://www.trippyants.com/blog/rss.xml`
- Publish a test post → verify at `/blog/your-slug`
- CMS at `/blog/cms` (login required)

---

## Architecture

```
Wix (trippyants.com)          Vercel Next.js (basePath /blog)
├── Home, Work, About    →    ├── /blog          (public blog)
└── Nav → /blog          →    ├── /blog/cms      (CMS)
                              ├── /blog/login
                              └── Supabase (new project)
```
