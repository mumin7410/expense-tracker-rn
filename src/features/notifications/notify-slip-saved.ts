import notifee, { AndroidStyle } from '@notifee/react-native';

import type { TransactionWithCategory } from '@/db/types';
import { baht } from '@/lib/format';
import { supabase } from '@/lib/supabase';

import { ensureSlipSavedChannel, SLIP_SAVED_CHANNEL_ID } from './channel';

/** Action ids the event handler in handle-notification-event.ts switches on. */
export const CONFIRM_CATEGORY_PREFIX = 'confirm-category:';
export const PICK_CATEGORY_ACTION = 'pick-category';

async function notificationsEnabled(): Promise<boolean> {
  const { data } = await supabase
    .from('user_settings')
    .select('notification_enabled')
    .maybeSingle();
  // Same default as the Settings screen's toggle: on until told otherwise.
  return data?.notification_enabled ?? true;
}

/**
 * The user's own two most-used categories, most recent first — not a guess
 * at what this slip is. Showing them as quick-tap shortcuts is exactly the
 * manual pick the pending screen already offers, just one tap closer; the
 * app never tries to predict what `transactions_auto_categorise` would have
 * assigned (see AGENTS.md).
 */
async function recentCategoryPicks(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('category:categories(id, name)')
    .eq('is_confirmed', true)
    .not('category_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error || !data) return [];

  const seen = new Map<string, string>();
  for (const row of data as unknown as { category: { id: string; name: string } | null }[]) {
    if (row.category && !seen.has(row.category.id)) {
      seen.set(row.category.id, row.category.name);
    }
    if (seen.size === 2) break;
  }
  return [...seen.entries()].map(([id, name]) => ({ id, name }));
}

/**
 * Fired after every successful save — from the manual review flow and from
 * the offline queue draining, so a slip that went through either path looks
 * the same to the user. A no-op if the user turned notifications off.
 */
export async function notifySlipSaved(transaction: TransactionWithCategory): Promise<void> {
  if (!(await notificationsEnabled())) return;
  await ensureSlipSavedChannel();

  const title = `บันทึกแล้ว ${baht(transaction.amount)}`;
  const subtitle = [transaction.recipient_name, transaction.bank_code]
    .filter(Boolean)
    .join(' · ');

  if (transaction.category) {
    await notifee.displayNotification({
      title: `${title}  ·  ${transaction.category.name}`,
      body: subtitle || undefined,
      data: { route: '/' },
      android: {
        channelId: SLIP_SAVED_CHANNEL_ID,
        smallIcon: 'ic_stat_notify',
        pressAction: { id: 'default' },
      },
    });
    return;
  }

  const picks = await recentCategoryPicks();
  await notifee.displayNotification({
    title: `${title}  ·  ยังไม่มีหมวด`,
    body: subtitle || undefined,
    data: { transactionId: transaction.id, route: '/pending' },
    android: {
      channelId: SLIP_SAVED_CHANNEL_ID,
      smallIcon: 'ic_stat_notify',
      pressAction: { id: 'default' },
      style: subtitle ? { type: AndroidStyle.BIGTEXT, text: subtitle } : undefined,
      actions: [
        ...picks.map((category) => ({
          title: category.name,
          pressAction: { id: `${CONFIRM_CATEGORY_PREFIX}${category.id}` },
        })),
        { title: 'เลือกหมวด', pressAction: { id: PICK_CATEGORY_ACTION } },
      ],
    },
  });
}
