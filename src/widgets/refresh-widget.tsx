import { requestWidgetUpdate } from 'react-native-android-widget';

import { ExpenseWidget } from './expense-widget';
import { loadWidgetData } from './widget-task-handler';

/**
 * Forces the home-screen widget to redraw right away. Called after a save
 * succeeds so the total moves immediately rather than waiting for the OS's
 * own update schedule (up to 30 minutes) or the next category confirmation —
 * matches the canvas note that the total must not wait for a category.
 *
 * A no-op if no widget is on the home screen (`widgetNotFound` is not set).
 */
export function refreshWidget() {
  requestWidgetUpdate({
    widgetName: 'ExpenseWidget',
    renderWidget: async () => <ExpenseWidget {...(await loadWidgetData())} />,
  }).catch(() => {
    // Best-effort — a save must never fail because the widget couldn't redraw.
  });
}
