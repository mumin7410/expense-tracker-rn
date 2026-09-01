import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import * as ScreenshotWatcher from 'screenshot-watcher';
import type { ScreenshotEntry, ScreenshotWatcherPermissions } from 'screenshot-watcher';

import { getLocalSetting, setLocalSetting } from '@/queue/db';
import { enqueue } from '@/queue/queue';
import { queueKeys } from '@/queue/use-queue';

const ENABLED_KEY = 'auto_capture_enabled';
const LAST_SCAN_KEY = 'auto_capture_last_scan_at';

/**
 * Opt-in screenshot capture: a foreground service (native side) watches
 * MediaStore for new screenshot-like images and emits them here; this hook's
 * only job is to turn those into queue entries. It never touches OCR or
 * Supabase directly — `enqueue` is the same entry point the manual picker
 * uses, so a screenshot slip goes through identical review/dedup/retry logic.
 *
 * The MediaStore catch-up scan on mount/foreground exists because the
 * ContentObserver can miss events the OS coalesces, or that happen while the
 * service isn't running yet (freshly enabled, or killed by the OS). The
 * watermark is stored locally, not in `user_settings` — it is meaningless on
 * any device but this one.
 */
export function useScreenshotWatcher() {
  const queryClient = useQueryClient();
  const [enabled, setEnabledState] = useState<boolean | null>(null);
  const [permissions, setPermissions] = useState<ScreenshotWatcherPermissions | null>(null);

  useEffect(() => {
    getLocalSetting(ENABLED_KEY).then((v) => setEnabledState(v === '1'));
    setPermissions(ScreenshotWatcher.hasPermissions());
  }, []);

  const enqueueEntry = useCallback(
    async (entry: ScreenshotEntry) => {
      const result = await enqueue({ imageUri: entry.uri });
      if (result === 'queued') {
        queryClient.invalidateQueries({ queryKey: queueKeys.size });
      }
    },
    [queryClient]
  );

  const runCatchUpScan = useCallback(async () => {
    const sinceRaw = await getLocalSetting(LAST_SCAN_KEY);
    const since = sinceRaw ? Number(sinceRaw) : Date.now();
    const found = await ScreenshotWatcher.scanForNewScreenshots(since);
    for (const entry of found) {
      await enqueueEntry(entry);
    }
    await setLocalSetting(LAST_SCAN_KEY, String(Date.now()));
  }, [enqueueEntry]);

  useEffect(() => {
    if (!enabled) return undefined;

    ScreenshotWatcher.startWatching();
    runCatchUpScan();

    const screenshotSub = ScreenshotWatcher.addScreenshotListener(enqueueEntry);
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') runCatchUpScan();
    });

    return () => {
      screenshotSub.remove();
      appStateSub.remove();
      ScreenshotWatcher.stopWatching();
    };
  }, [enabled, enqueueEntry, runCatchUpScan]);

  const setEnabled = useCallback(async (next: boolean) => {
    if (next) {
      await ScreenshotWatcher.requestPermissions();
      const granted = ScreenshotWatcher.hasPermissions();
      setPermissions(granted);
      if (!granted.images) {
        // Nothing to watch without read access — leave the toggle off and
        // let the caller show the OS's permanently-denied state if relevant.
        return;
      }
    }
    await setLocalSetting(ENABLED_KEY, next ? '1' : '0');
    setEnabledState(next);
  }, []);

  return {
    enabled: enabled ?? false,
    isLoading: enabled === null,
    permissions,
    setEnabled,
  };
}
