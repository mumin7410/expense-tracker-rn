import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { transactionKeys } from '@/features/transactions/queries';
import { useAuth } from '@/lib/auth';
import { flushQueue, queueSize } from '@/queue/queue';

export const queueKeys = {
  size: ['queue', 'size'] as const,
};

/** How many slips are waiting to reach Supabase. */
export function useQueueSize() {
  return useQuery({
    queryKey: queueKeys.size,
    queryFn: queueSize,
    staleTime: 0,
  });
}

/**
 * Drains the queue whenever there is a reason to think it might work:
 * on mount once signed in, and every time the app comes back to the
 * foreground — which is the moment a user who walked back into signal
 * would expect their slips to go up.
 *
 * There is no connectivity check on purpose. Asking the OS whether it has a
 * network says nothing about whether *this* service is reachable, and the
 * attempt itself is the only honest answer.
 */
export function useQueueSync() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  const flush = useMutation({
    mutationFn: async () => {
      if (!userId) return null;
      return flushQueue(userId);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queueKeys.size });
      if (result && (result.uploaded > 0 || result.duplicates > 0)) {
        queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      }
    },
  });

  const run = flush.mutate;

  useEffect(() => {
    if (!userId) return;

    run();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });

    return () => subscription.remove();
  }, [userId, run]);

  return flush;
}
