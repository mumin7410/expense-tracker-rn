import { useQuery } from '@tanstack/react-query';

import type { Category } from '@/db/types';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export const categoryKeys = {
  all: ['categories'] as const,
};

/**
 * The picker's list: the eleven shared defaults plus anything this user added.
 *
 * RLS already limits the rows to `user_id is null or user_id = auth.uid()`, so
 * no filter is needed here — asking for one would only be able to narrow it.
 */
export function useCategories() {
  const { session } = useAuth();

  return useQuery({
    queryKey: categoryKeys.all,
    enabled: Boolean(session),
    // Categories change when the user adds one, which is rare.
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, user_id, name, icon, keywords, sort_order')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });
}
