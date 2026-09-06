import notifee, { AuthorizationStatus } from '@notifee/react-native';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Whether Android will actually deliver a notification.
 *
 * `user_settings.notification_enabled` is the user's intent; this is the OS's
 * answer, and the two disagree the moment POST_NOTIFICATIONS is denied — which
 * is the default on a fresh install. Driving the settings toggle from the row
 * alone showed it on while Android dropped every notification, so the toggle
 * has to know both.
 *
 * Re-checked on foreground because the only way back from a permanent denial
 * is the system settings screen, which means leaving the app and returning.
 */
export function useNotificationPermission() {
  const [granted, setGranted] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    const settings = await notifee.getNotificationSettings();
    setGranted(settings.authorizationStatus === AuthorizationStatus.AUTHORIZED);
  }, []);

  useEffect(() => {
    let active = true;

    notifee.getNotificationSettings().then((settings) => {
      if (active) setGranted(settings.authorizationStatus === AuthorizationStatus.AUTHORIZED);
    });

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    return () => {
      active = false;
      sub.remove();
    };
  }, [refresh]);

  /** Prompts, and reports what the user chose so the caller can leave the toggle off. */
  const request = useCallback(async () => {
    const settings = await notifee.requestPermission();
    const ok = settings.authorizationStatus === AuthorizationStatus.AUTHORIZED;
    setGranted(ok);
    return ok;
  }, []);

  return { granted, request };
}
