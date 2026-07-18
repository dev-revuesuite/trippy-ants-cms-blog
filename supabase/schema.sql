-- ============================================================
-- Trippy Ants CMS — Database schema
-- Run ONCE in Supabase Dashboard → SQL Editor (new empty project).
-- Do NOT use a read-replica or pooler URL for this script.
-- ============================================================

-- ---------- 1. Enums ----------
create type public.user_role as enum ('admin', 'editor', 'author');
create type public.post_status as enum ('draft', 'scheduled', 'published', 'archived');

-- ---------- 2. Tables (before functions that reference them) ----------

create table public.users (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  full_name  text,
  role       public.user_role not null default 'author',
  created_at timestamptz not null default now()
);

create table public.authors (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.users(id) on delete set null,
  name       text not null,
  slug       text not null unique,
  bio        text,
  avatar_url text,
  twitter    text,
  linkedin   text,
  website    text,
  created_at timestamptz not null default now()
);

create index authors_user_id_idx on public.authors(user_id);
create index authors_slug_idx on public.authors(slug);

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  created_at  timestamptz not null default now()
);

create index categories_slug_idx on public.categories(slug);

create table public.tags (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  created_at timestamptz not null default now()
);

create index tags_slug_idx on public.tags(slug);

create table public.posts (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  slug             text not null unique,
  excerpt          text,
  content_json     jsonb,
  content_html     text,
  featured_image   text,
  status           public.post_status not null default 'draft',
  published_at     timestamptz,
  author_id        uuid references public.authors(id) on delete set null,
  category_id      uuid references public.categories(id) on delete set null,
  meta_title       text,
  meta_description text,
  focus_keyword    text,
  canonical_url    text,
  og_image         text,
  robots           text default 'index,follow',
  schema_type      text default 'Article',
  faqs             jsonb not null default '[]'::jsonb,
  cta_block        jsonb,
  reading_time     int not null default 0,
  view_count       int not null default 0,
  search_vector    tsvector,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index posts_status_published_idx on public.posts(status, published_at desc);
create index posts_slug_idx on public.posts(slug);
create index posts_author_id_idx on public.posts(author_id);
create index posts_category_id_idx on public.posts(category_id);
create index posts_search_vector_idx on public.posts using gin(search_vector);

create table public.post_tags (
  post_id uuid not null references public.posts(id) on delete cascade,
  tag_id  uuid not null references public.tags(id) on delete cascade,
  primary key (post_id, tag_id)
);

create table public.revisions (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references public.posts(id) on delete cascade,
  title        text,
  content_json jsonb,
  content_html text,
  edited_by    uuid references public.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index revisions_post_id_idx on public.revisions(post_id);

create table public.media (
  id           uuid primary key default gen_random_uuid(),
  url          text not null,
  storage_path text not null,
  filename     text not null,
  mime_type    text,
  width        int,
  height       int,
  size_bytes   bigint,
  alt_text     text,
  folder       text not null default 'uploads',
  uploaded_by  uuid references public.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

create table public.settings (
  id                       int primary key default 1 check (id = 1),
  site_title               text not null default 'Trippy Ants Journal',
  site_description         text not null default 'Design stories and creative insights from Trippy Ants Design, Jaipur.',
  default_og_image         text,
  twitter_handle           text,
  linkedin_url             text,
  default_meta_title       text,
  default_meta_description text
);

insert into public.settings (id, site_title, site_description)
values (1, 'Trippy Ants Journal', 'Design stories and creative insights from Trippy Ants Design, Jaipur.');

-- ---------- 3. Functions & triggers ----------

create or replace function public.set_updated_at()
returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.posts_search_vector_update()
returns trigger
language plpgsql as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.excerpt, '')), 'B') ||
    setweight(
      to_tsvector(
        'english',
        coalesce(new.meta_title, '') || ' ' ||
        coalesce(new.meta_description, '') || ' ' ||
        coalesce(new.focus_keyword, '')
      ),
      'C'
    ) ||
    setweight(
      to_tsvector(
        'english',
        coalesce(regexp_replace(new.content_html, '<[^>]+>', ' ', 'g'), '')
      ),
      'D'
    );
  return new;
end;
$$;

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

create trigger posts_search_vector_trigger
  before insert or update of title, excerpt, meta_title, meta_description, focus_keyword, content_html
  on public.posts
  for each row execute function public.posts_search_vector_update();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'author'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS helpers (must come after public.users exists)
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and role in ('admin', 'editor', 'author')
  );
$$;

create or replace function public.is_editor_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and role in ('admin', 'editor')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- 4. Row Level Security ----------

alter table public.users enable row level security;
alter table public.authors enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.posts enable row level security;
alter table public.post_tags enable row level security;
alter table public.revisions enable row level security;
alter table public.media enable row level security;
alter table public.settings enable row level security;

create policy users_read_own on public.users for select
  using (auth.uid() = id or public.is_admin());

create policy users_admin_update on public.users for update
  using (public.is_admin());

create policy authors_public_read on public.authors for select using (true);

create policy authors_staff_write on public.authors for all
  using (public.is_staff())
  with check (public.is_staff());

create policy categories_public_read on public.categories for select using (true);

create policy categories_editor_write on public.categories for all
  using (public.is_editor_or_admin())
  with check (public.is_editor_or_admin());

create policy tags_public_read on public.tags for select using (true);

create policy tags_editor_write on public.tags for all
  using (public.is_editor_or_admin())
  with check (public.is_editor_or_admin());

create policy posts_public_read on public.posts for select
  using (
    status = 'published'
    and published_at is not null
    and published_at <= now()
  );

create policy posts_staff_read on public.posts for select
  using (public.is_staff());

create policy posts_staff_insert on public.posts for insert
  with check (public.is_staff());

create policy posts_editor_update on public.posts for update
  using (public.is_editor_or_admin());

create policy posts_author_update on public.posts for update
  using (
    public.current_user_role() = 'author'
    and status in ('draft', 'scheduled')
    and author_id in (select id from public.authors where user_id = auth.uid())
  );

create policy posts_editor_delete on public.posts for delete
  using (public.is_editor_or_admin());

create policy post_tags_public_read on public.post_tags for select
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_id
        and p.status = 'published'
        and p.published_at is not null
        and p.published_at <= now()
    )
  );

create policy post_tags_staff_all on public.post_tags for all
  using (public.is_staff())
  with check (public.is_staff());

create policy revisions_staff on public.revisions for all
  using (public.is_staff())
  with check (public.is_staff());

create policy media_public_read on public.media for select using (true);

create policy media_staff_write on public.media for all
  using (public.is_staff())
  with check (public.is_staff());

create policy settings_public_read on public.settings for select using (true);

create policy settings_admin_write on public.settings for all
  using (public.is_admin())
  with check (public.is_admin());
