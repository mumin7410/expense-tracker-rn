import * as SQLite from 'expo-sqlite';

/**
 * The upload queue.
 *
 * A slip moves through two stages, and the row records which one it is in:
 *   1. `parsed_json` is null — still needs OCR.
 *   2. `parsed_json` is set — OCR is done, only the Supabase insert is left.
 *
 * Keeping the parse result means a failed insert never pays for OCR twice, and
 * K PLUS costs about 5.5 s a go.
 *
 * `dedup_key` is stored purely so the queue can check itself before uploading;
 * it is never sent to Postgres, which computes its own.
 */
const SCHEMA = `
  pragma journal_mode = WAL;

  create table if not exists upload_queue (
    id           integer primary key autoincrement,
    image_uri    text    not null,
    parsed_json  text,
    raw_text     text,
    dedup_key    text,
    attempts     integer not null default 0,
    last_error   text,
    created_at   text    not null default (datetime('now'))
  );

  create index if not exists upload_queue_dedup_idx
    on upload_queue (dedup_key) where dedup_key is not null;

  create table if not exists local_settings (
    key   text primary key,
    value text not null
  );
`;

let handle: Promise<SQLite.SQLiteDatabase> | null = null;

/** Opens the database once and runs the schema. Safe to call from anywhere. */
export function getQueueDb(): Promise<SQLite.SQLiteDatabase> {
  if (!handle) {
    handle = SQLite.openDatabaseAsync('slip-queue.db').then(async (db) => {
      await db.execAsync(SCHEMA);
      return db;
    });
  }
  return handle;
}

/** Device-local prefs that don't belong in `user_settings` — nothing here needs to sync across devices. */
export async function getLocalSetting(key: string): Promise<string | null> {
  const db = await getQueueDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'select value from local_settings where key = ?',
    key
  );
  return row?.value ?? null;
}

export async function setLocalSetting(key: string, value: string): Promise<void> {
  const db = await getQueueDb();
  await db.runAsync(
    'insert into local_settings (key, value) values (?, ?) on conflict(key) do update set value = excluded.value',
    key,
    value
  );
}

export type QueueRow = {
  id: number;
  image_uri: string;
  parsed_json: string | null;
  raw_text: string | null;
  dedup_key: string | null;
  attempts: number;
  last_error: string | null;
  created_at: string;
};
