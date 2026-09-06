import notifee, { EventType, type Event } from '@notifee/react-native';
import { Linking } from 'react-native';

import { supabase } from '@/lib/supabase';

import { CONFIRM_CATEGORY_PREFIX, PICK_CATEGORY_ACTION } from './notify-slip-saved';

/**
 * Shared by onForegroundEvent (app open) and onBackgroundEvent (app closed
 * or killed) so a button tap behaves the same either way. Quick-category
 * presses patch category_id and is_confirmed together in one request — same
 * requirement as useConfirmCategory, since transactions_learn_category only
 * fires on that exact combination.
 */
export async function handleNotificationEvent({ type, detail }: Event): Promise<void> {
  const notification = detail.notification;
  const pressActionId = detail.pressAction?.id;

  if (type === EventType.ACTION_PRESS && pressActionId?.startsWith(CONFIRM_CATEGORY_PREFIX)) {
    const categoryId = pressActionId.slice(CONFIRM_CATEGORY_PREFIX.length);
    const transactionId = notification?.data?.transactionId as string | undefined;
    if (transactionId) {
      await supabase
        .from('transactions')
        .update({ category_id: categoryId, is_confirmed: true })
        .eq('id', transactionId);
    }
    if (notification?.id) await notifee.cancelNotification(notification.id);
    return;
  }

  const shouldOpen =
    type === EventType.PRESS ||
    (type === EventType.ACTION_PRESS && pressActionId === PICK_CATEGORY_ACTION);

  if (shouldOpen) {
    const route = (notification?.data?.route as string | undefined) ?? '/';
    await Linking.openURL(`expensetracker://${route.replace(/^\//, '')}`);
  }
}
