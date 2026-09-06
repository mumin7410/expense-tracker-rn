import notifee from '@notifee/react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { handleNotificationEvent } from '@/features/notifications/handle-notification-event';
import { widgetTaskHandler } from '@/widgets/widget-task-handler';

registerWidgetTaskHandler(widgetTaskHandler);
notifee.onBackgroundEvent(handleNotificationEvent);

import 'expo-router/entry';
