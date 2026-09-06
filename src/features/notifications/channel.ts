import notifee, { AndroidImportance } from '@notifee/react-native';

export const SLIP_SAVED_CHANNEL_ID = 'slip-saved';

let created: Promise<void> | null = null;

/** Idempotent — safe to call before every notification. */
export function ensureSlipSavedChannel(): Promise<void> {
  if (!created) {
    created = notifee
      .createChannel({
        id: SLIP_SAVED_CHANNEL_ID,
        name: 'บันทึกสลิปแล้ว',
        importance: AndroidImportance.DEFAULT,
      })
      .then(() => undefined);
  }
  return created;
}
