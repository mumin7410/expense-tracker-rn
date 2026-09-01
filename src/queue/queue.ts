import type { TransactionInsert } from '@/db/types';
import { OcrError, parseSlip, type ParsedSlip } from '@/lib/ocr';
import { supabase } from '@/lib/supabase';
import { getQueueDb, type QueueRow } from '@/queue/db';

/** Postgres unique violation on `(user_id, dedup_key)` — the slip is already in. */
const UNIQUE_VIOLATION = '23505';

/** Given up on after this many tries, so a broken row cannot spin forever. */
const MAX_ATTEMPTS = 5;

export type QueueItem = {
  id: number;
  imageUri: string;
  parsed: ParsedSlip | null;
  rawText: string | null;
  attempts: number;
  lastError: string | null;
};

function toItem(row: QueueRow): QueueItem {
  return {
    id: row.id,
    imageUri: row.image_uri,
    parsed: row.parsed_json ? (JSON.parse(row.parsed_json) as ParsedSlip) : null,
    rawText: row.raw_text,
    attempts: row.attempts,
    lastError: row.last_error,
  };
}

export async function listQueue(): Promise<QueueItem[]> {
  const db = await getQueueDb();
  const rows = await db.getAllAsync<QueueRow>(
    'select * from upload_queue order by created_at asc'
  );
  return rows.map(toItem);
}

export async function queueSize(): Promise<number> {
  const db = await getQueueDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'select count(*) as count from upload_queue'
  );
  return row?.count ?? 0;
}

/**
 * Adds a slip to the queue.
 *
 * `parsed` is optional: an image that never reached the OCR service is stored
 * without it, and OCR runs on the next attempt. When it is present, the
 * queue's own `dedup_key` check stops the same slip being queued twice from
 * two screenshots of one transfer — Postgres would reject the second anyway,
 * but not until there is a network to reject it over.
 */
export async function enqueue(input: {
  imageUri: string;
  parsed?: ParsedSlip | null;
  rawText?: string | null;
  lastError?: string | null;
}): Promise<'queued' | 'already-queued'> {
  const db = await getQueueDb();
  const dedupKey = input.parsed?.dedup_key ?? null;

  if (dedupKey) {
    const existing = await db.getFirstAsync<{ id: number }>(
      'select id from upload_queue where dedup_key = ?',
      dedupKey
    );
    if (existing) return 'already-queued';
  }

  // Screenshot detection has no dedup_key to check yet — a single MediaStore
  // write can still fire the watcher's ContentObserver more than once (seen
  // for real: one screenshot produced 3 onChange callbacks), so also refuse a
  // second row for a URI already sitting in the queue unparsed.
  const existingByUri = await db.getFirstAsync<{ id: number }>(
    'select id from upload_queue where image_uri = ? and parsed_json is null',
    input.imageUri
  );
  if (existingByUri) return 'already-queued';

  await db.runAsync(
    `insert into upload_queue (image_uri, parsed_json, raw_text, dedup_key, last_error)
     values (?, ?, ?, ?, ?)`,
    input.imageUri,
    input.parsed ? JSON.stringify(input.parsed) : null,
    input.rawText ?? null,
    dedupKey,
    input.lastError ?? null
  );

  return 'queued';
}

export async function removeFromQueue(id: number): Promise<void> {
  const db = await getQueueDb();
  await db.runAsync('delete from upload_queue where id = ?', id);
}

async function recordFailure(id: number, message: string): Promise<void> {
  const db = await getQueueDb();
  await db.runAsync(
    'update upload_queue set attempts = attempts + 1, last_error = ? where id = ?',
    message,
    id
  );
}

async function storeParse(
  id: number,
  parsed: ParsedSlip,
  rawText: string
): Promise<void> {
  const db = await getQueueDb();
  await db.runAsync(
    'update upload_queue set parsed_json = ?, raw_text = ?, dedup_key = ? where id = ?',
    JSON.stringify(parsed),
    rawText,
    parsed.dedup_key,
    id
  );
}

export type FlushResult = {
  uploaded: number;
  duplicates: number;
  remaining: number;
  givenUp: number;
};

/**
 * Works through the queue once.
 *
 * Stops at the first item that fails for a reason the next one would hit too —
 * a dead OCR service or no network — instead of burning every item's attempt
 * counter on the same outage. Verdicts on one specific image (400, 413, 415)
 * only drop that image and let the rest continue.
 */
export async function flushQueue(userId: string): Promise<FlushResult> {
  const items = await listQueue();
  const result: FlushResult = {
    uploaded: 0,
    duplicates: 0,
    remaining: items.length,
    givenUp: 0,
  };

  for (const item of items) {
    if (item.attempts >= MAX_ATTEMPTS) {
      result.givenUp += 1;
      continue;
    }

    let parsed = item.parsed;
    let rawText = item.rawText;

    if (!parsed) {
      try {
        const ocr = await parseSlip(item.imageUri);
        parsed = ocr.parsed;
        rawText = ocr.text;
        await storeParse(item.id, ocr.parsed, ocr.text);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'อ่านสลิปไม่สำเร็จ';
        await recordFailure(item.id, message);
        // A rejected image will be rejected identically forever, so drop it
        // rather than let it block the queue every time.
        if (cause instanceof OcrError && !cause.retryable) {
          await removeFromQueue(item.id);
          result.remaining -= 1;
          result.givenUp += 1;
          continue;
        }
        break;
      }
    }

    if (!parsed.amount || !parsed.transaction_date) {
      await recordFailure(item.id, 'สลิปนี้ไม่มียอดเงินหรือวันที่');
      await removeFromQueue(item.id);
      result.remaining -= 1;
      result.givenUp += 1;
      continue;
    }

    const row: TransactionInsert = {
      user_id: userId,
      amount: parsed.amount,
      transaction_date: parsed.transaction_date,
      bank_code: parsed.bank_code,
      slip_type: parsed.slip_type,
      fee: parsed.fee,
      sender_name: parsed.sender_name,
      sender_account: parsed.sender_account,
      recipient_name: parsed.recipient_name,
      recipient_account: parsed.recipient_account,
      transaction_ref: parsed.transaction_ref,
      raw_ocr_text: rawText ?? '',
    };

    const { error } = await supabase.from('transactions').insert(row);

    if (!error) {
      await removeFromQueue(item.id);
      result.uploaded += 1;
      result.remaining -= 1;
      continue;
    }

    if (error.code === UNIQUE_VIOLATION) {
      // Already stored. Nothing to retry, nothing to tell the user.
      await removeFromQueue(item.id);
      result.duplicates += 1;
      result.remaining -= 1;
      continue;
    }

    await recordFailure(item.id, error.message);
    break;
  }

  return result;
}
