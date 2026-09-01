import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export type UserSettings = {
  user_id: string;
  widget_style: string;
  notification_enabled: boolean;
};

export const settingsKeys = {
  settings: ['user-settings'] as const,
  learnedRecipients: ['recipient-map', 'count'] as const,
};

/**
 * The row is created by `handle_new_user()` at signup, so the app only ever
 * reads and updates it — never inserts. `maybeSingle` because a brand new
 * account can reach this screen before the trigger's row is visible.
 */
export function useUserSettings() {
  const { session } = useAuth();

  return useQuery({
    queryKey: settingsKeys.settings,
    enabled: Boolean(session),
    queryFn: async (): Promise<UserSettings | null> => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('user_id, widget_style, notification_enabled')
        .maybeSingle();

      if (error) throw error;
      return data as UserSettings | null;
    },
  });
}

export function useUpdateSettings() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: Partial<Omit<UserSettings, 'user_id'>>) => {
      const userId = session?.user.id;
      if (!userId) throw new Error('ยังไม่ได้เข้าสู่ระบบ');

      const { data, error } = await supabase
        .from('user_settings')
        .update(patch)
        .eq('user_id', userId)
        .select('user_id, widget_style, notification_enabled')
        .single();

      if (error) throw error;
      return data as UserSettings;
    },
    onSuccess: (next) => {
      queryClient.setQueryData(settingsKeys.settings, next);
    },
  });
}

/**
 * How many recipients the app has learned a category for.
 *
 * Worth surfacing: it is the only visible evidence that confirming a category
 * actually taught `recipient_category_map` something, which is otherwise a
 * silent trigger nobody can see working.
 */
export function useLearnedRecipientCount() {
  const { session } = useAuth();

  return useQuery({
    queryKey: settingsKeys.learnedRecipients,
    enabled: Boolean(session),
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('recipient_category_map')
        .select('id', { count: 'exact', head: true });

      if (error) throw error;
      return count ?? 0;
    },
  });
}
