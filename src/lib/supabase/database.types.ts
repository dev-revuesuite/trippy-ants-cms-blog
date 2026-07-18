// Supabase Database types (hand-maintained; regenerate from schema when it changes)

export type PostStatus = 'draft' | 'scheduled' | 'published' | 'archived';
export type UserRole = 'admin' | 'editor' | 'author';

export interface FAQ {
  question: string;
  answer: string;
}

export interface CTABlock {
  heading?: string;
  body?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/** Matches @supabase/supabase-js GenericRelationship (empty array = no FK joins). */
export type TableRelationships = Array<{
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
}>;

export interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export interface AuthorRow {
  id: string;
  user_id: string | null;
  name: string;
  slug: string;
  bio: string | null;
  avatar_url: string | null;
  twitter: string | null;
  linkedin: string | null;
  website: string | null;
  created_at: string;
}

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
}

export interface TagRow {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface PostRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content_json: Json | null;
  content_html: string | null;
  featured_image: string | null;
  status: PostStatus;
  published_at: string | null;
  author_id: string | null;
  category_id: string | null;
  meta_title: string | null;
  meta_description: string | null;
  focus_keyword: string | null;
  canonical_url: string | null;
  og_image: string | null;
  robots: string | null;
  schema_type: string | null;
  faqs: FAQ[];
  cta_block: CTABlock | null;
  reading_time: number;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface PostTagRow {
  post_id: string;
  tag_id: string;
}

export interface RevisionRow {
  id: string;
  post_id: string;
  title: string | null;
  content_json: Json | null;
  content_html: string | null;
  edited_by: string | null;
  created_at: string;
}

export interface MediaRow {
  id: string;
  url: string;
  storage_path: string;
  filename: string;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  alt_text: string | null;
  folder: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface SettingsRow {
  id: number;
  site_title: string;
  site_description: string;
  default_og_image: string | null;
  twitter_handle: string | null;
  linkedin_url: string | null;
  default_meta_title: string | null;
  default_meta_description: string | null;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserRow;
        Insert: Pick<UserRow, 'id' | 'email'> & Partial<Omit<UserRow, 'id' | 'email'>>;
        Update: Partial<UserRow>;
        Relationships: TableRelationships;
      };
      authors: {
        Row: AuthorRow;
        Insert: Pick<AuthorRow, 'name' | 'slug'> & Partial<Omit<AuthorRow, 'name' | 'slug'>>;
        Update: Partial<AuthorRow>;
        Relationships: TableRelationships;
      };
      categories: {
        Row: CategoryRow;
        Insert: Pick<CategoryRow, 'name' | 'slug'> & Partial<Omit<CategoryRow, 'name' | 'slug'>>;
        Update: Partial<CategoryRow>;
        Relationships: TableRelationships;
      };
      tags: {
        Row: TagRow;
        Insert: Pick<TagRow, 'name' | 'slug'> & Partial<Omit<TagRow, 'name' | 'slug'>>;
        Update: Partial<TagRow>;
        Relationships: TableRelationships;
      };
      posts: {
        Row: PostRow;
        Insert: Pick<PostRow, 'title' | 'slug'> & Partial<Omit<PostRow, 'title' | 'slug'>>;
        Update: Partial<PostRow>;
        Relationships: TableRelationships;
      };
      post_tags: {
        Row: PostTagRow;
        Insert: PostTagRow;
        Update: Partial<PostTagRow>;
        Relationships: TableRelationships;
      };
      revisions: {
        Row: RevisionRow;
        Insert: Pick<RevisionRow, 'post_id'> & Partial<Omit<RevisionRow, 'post_id'>>;
        Update: Partial<RevisionRow>;
        Relationships: TableRelationships;
      };
      media: {
        Row: MediaRow;
        Insert: Pick<MediaRow, 'url' | 'storage_path' | 'filename'> &
          Partial<Omit<MediaRow, 'url' | 'storage_path' | 'filename'>>;
        Update: Partial<MediaRow>;
        Relationships: TableRelationships;
      };
      settings: {
        Row: SettingsRow;
        Insert: Partial<SettingsRow>;
        Update: Partial<SettingsRow>;
        Relationships: TableRelationships;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
  };
}

export type Post = PostRow;
export type Category = CategoryRow;
export type Tag = TagRow;
export type Author = AuthorRow;
export type Media = MediaRow;
