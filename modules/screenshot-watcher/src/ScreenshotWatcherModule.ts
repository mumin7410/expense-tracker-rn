import { NativeModule, requireNativeModule } from 'expo';

import type { ScreenshotWatcherEvents, ScreenshotWatcherPermissions, ScreenshotEntry } from './ScreenshotWatcher.types';

declare class ScreenshotWatcherModule extends NativeModule<ScreenshotWatcherEvents> {
  isWatching(): boolean;
  hasPermissions(): ScreenshotWatcherPermissions;
  /** Resolves once the OS dialog closes; the result is an aggregate over both
   *  permissions asked, not per-permission — read {@link hasPermissions} after
   *  it resolves for the granular images/notifications state. */
  requestPermissions(): Promise<{ granted: boolean; canAskAgain: boolean }>;
  startWatching(): void;
  stopWatching(): void;
  scanForNewScreenshots(sinceMs: number): Promise<ScreenshotEntry[]>;
}

export default requireNativeModule<ScreenshotWatcherModule>('ScreenshotWatcher');
