import ScreenshotWatcher from './ScreenshotWatcherModule';
import type { ScreenshotEntry } from './ScreenshotWatcher.types';

export type { ScreenshotEntry, ScreenshotWatcherPermissions } from './ScreenshotWatcher.types';

export function hasPermissions() {
  return ScreenshotWatcher.hasPermissions();
}

/** Asks for both permissions, then returns the real per-permission state — see the native module's doc comment on why the request itself only resolves an aggregate. */
export async function requestPermissions() {
  await ScreenshotWatcher.requestPermissions();
  return ScreenshotWatcher.hasPermissions();
}

export function isWatching() {
  return ScreenshotWatcher.isWatching();
}

/** Starts the foreground service. Caller must already hold both permissions — this does not ask. */
export function startWatching() {
  ScreenshotWatcher.startWatching();
}

export function stopWatching() {
  ScreenshotWatcher.stopWatching();
}

/** Reliability backstop: the ContentObserver can miss events the OS coalesces or drops
 * while the service was killed/not yet started. Call on launch and on foreground with the
 * last-checked timestamp; it returns every screenshot-like image added since. */
export function scanForNewScreenshots(sinceMs: number) {
  return ScreenshotWatcher.scanForNewScreenshots(sinceMs);
}

export function addScreenshotListener(listener: (entry: ScreenshotEntry) => void) {
  return ScreenshotWatcher.addListener('onScreenshotDetected', listener);
}
