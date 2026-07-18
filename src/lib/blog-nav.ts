import { unstable_cache } from 'next/cache';
import { createAnonClient } from '@/lib/supabase/server';

export type HeaderCategory = { name: string; slug: string };

export const getHeaderCategories = unstable_cache(
  async (): Promise<HeaderCategory[]> => {
    const supabase = createAnonClient();
    const { data } = await supabase
      .from('categories')
      .select('name,slug')
      .order('name')
      .limit(4);
    return data ?? [];
  },
  ['header-categories'],
  { revalidate: 300, tags: ['categories'] },
);
