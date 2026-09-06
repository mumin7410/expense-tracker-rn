import type { WidgetTaskHandler } from 'react-native-android-widget';

import type { TransactionWithCategory } from '@/db/types';
import { summarise } from '@/features/transactions/summary';
import { monthYear } from '@/lib/format';
import { supabase } from '@/lib/supabase';

import { ExpenseWidget } from './expense-widget';

const SELECT = '*, category:categories(id, name, icon)';

/** Duplicated from queries.ts on purpose — importing it here would pull the
 * widget module into the same import graph as queries.ts, and refresh-widget
 * is called from queue.ts, which queries.ts's SELECT constant is shared with,
 * risking a circular import for four lines of date math. */
function monthRange(date: Date): { from: string; to: string } {
  const from = new Date(date.getFullYear(), date.getMonth(), 1);
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

/**
 * Runs headless — no React tree, no React Query cache — so it fetches
 * straight from Supabase using whatever session the shared client already
 * restored from SecureStore. Re-fetching on every WIDGET_UPDATE (rather than
 * being handed data from the app) means a periodic OS-triggered update and an
 * explicit refresh after a save both just work the same way.
 */
export async function loadWidgetData() {
  const now = new Date();
  const { from, to } = monthRange(now);

  const { data, error } = await supabase
    .from('transactions')
    .select(SELECT)
    .gte('transaction_date', from)
    .lt('transaction_date', to);

  if (error) throw error;

  const rows = (data ?? []) as unknown as TransactionWithCategory[];
  return {
    monthLabel: monthYear(now),
    slipCount: rows.length,
    summary: summarise(rows),
  };
}

export const widgetTaskHandler: WidgetTaskHandler = async (props) => {
  if (props.widgetInfo.widgetName !== 'ExpenseWidget') return;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      try {
        const data = await loadWidgetData();
        // Dev only: this prints the month's spend, which does not belong in a
        // release logcat. It is the only window into a headless render.
        if (__DEV__) console.log('[widget]', props.widgetAction, JSON.stringify(data));
        props.renderWidget(<ExpenseWidget {...data} />);
      } catch (err) {
        // No session yet, or offline — leave the widget showing its last
        // successful render rather than replacing it with an error state.
        console.error('[widget] render failed', err);
      }
      break;
    }
    case 'WIDGET_DELETED':
    case 'WIDGET_CLICK':
      break;
  }
};
