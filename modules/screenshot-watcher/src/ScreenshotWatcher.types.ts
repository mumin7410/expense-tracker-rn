export type ScreenshotEntry = {
  uri: string;
  /** ms since epoch, from MediaStore's DATE_ADDED */
  timestamp: number;
};

export type ScreenshotWatcherEvents = {
  onScreenshotDetected: (entry: ScreenshotEntry) => void;
};

export type ScreenshotWatcherPermissions = {
  images: boolean;
  notifications: boolean;
};
