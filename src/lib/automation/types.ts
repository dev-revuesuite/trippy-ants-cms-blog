// Shared types for the blog automation pipeline.

/** A row read from the Google Sheet that still needs processing. */
export interface SheetRow {
  sourceKey: string;
  sheetRow: number;
  title: string;
  imageUrl: string;
}

export type SheetWritebackStatus = 'processing' | 'pending' | 'published' | 'failed';

export interface StatusWriteback {
  sheetRow: number;
  status: SheetWritebackStatus;
  postUrl?: string;
  error?: string;
}

export interface FailureAlert {
  title: string;
  error: string;
}

export interface FeaturedImageResult {
  url: string;
  storagePath: string;
  altText: string;
}

export interface GeneratedArticle {
  title: string;
  slug: string;
  excerpt: string;
  content_html: string;
  meta_title: string;
  meta_description: string;
  focus_keyword: string;
  tags: string[];
  faqs: { question: string; answer: string }[];
}

export interface PublishedPostResult {
  postId: string;
  slug: string;
  url: string;
}

export interface JobDraft {
  article: GeneratedArticle;
  contentHtml: string;
}

export type PipelineStep =
  | 'pending'
  | 'generating'
  | 'draft_ready'
  | 'imaging'
  | 'image_ready'
  | 'publishing'
  | 'done'
  | 'failed';

export interface ContentJobRow {
  id: string;
  source_key: string;
  sheet_row: number | null;
  title: string;
  keywords: string | null;
  category: string | null;
  tags: string | null;
  notes: string | null;
  prompt: string | null;
  image_url: string | null;
  status: 'pending' | 'processing' | 'done' | 'failed';
  step: PipelineStep;
  draft_json: JobDraft | null;
  featured_image_url: string | null;
  attempts: number;
  max_attempts: number;
  error: string | null;
  post_id: string | null;
  post_url: string | null;
  claimed_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}
