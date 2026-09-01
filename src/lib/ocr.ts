import { File } from 'expo-file-system';

import { ocrBaseUrl, requireEnv } from '@/lib/env';

export type SlipType = 'transfer' | 'bill_payment' | 'topup';

/**
 * What the parser returns. Every field except `amount` and `transaction_date`
 * can be missing — an unrecognised bank still yields those two, because they
 * are the only patterns that hold across every layout tested.
 *
 * `amount` and `fee` arrive as strings and stay strings here: they are decimal
 * money, and Supabase takes them as `numeric`. Parsing them into a float would
 * introduce rounding the OCR never made.
 */
export type ParsedSlip = {
  bank_code: string | null;
  bank_name: string | null;
  slip_type: SlipType | null;
  amount: string | null;
  fee: string | null;
  transaction_date: string | null;
  transaction_ref: string | null;
  sender_name: string | null;
  sender_account: string | null;
  /** Display only. Bold Thai names come back mangled; let the user fix it. */
  recipient_name: string | null;
  /** Digits only, mask discarded. The stable key for auto-categorising. */
  recipient_account: string | null;
  /** For checking the local upload queue. Postgres recomputes it on insert. */
  dedup_key: string | null;
  missing_fields: string[];
  warnings: string[];
};

export type OcrResult = {
  parsed: ParsedSlip;
  /** Raw text. Always store it — it is the only way to debug a bad parse. */
  text: string;
  meta: Record<string, unknown>;
};

/**
 * K PLUS takes about 5.5 s because it needs a second OCR pass for the
 * reference code, and that is before the image leaves the phone. The handoff
 * says never below 15 s; 30 s leaves room for a slow upload over mobile data.
 */
const TIMEOUT_MS = 30_000;

export class OcrError extends Error {
  readonly status: number | null;
  /** Whether trying the same image again could plausibly work. */
  readonly retryable: boolean;

  constructor(message: string, status: number | null, retryable: boolean) {
    super(message);
    this.name = 'OcrError';
    this.status = status;
    this.retryable = retryable;
  }
}

/**
 * Only 503 is worth retrying — it means the OCR service itself is down. 400,
 * 413 and 415 are verdicts on the image, and the same bytes will always get
 * the same answer. The offline queue keys its behaviour off this flag.
 */
function describe(status: number): OcrError {
  switch (status) {
    case 400:
      return new OcrError('อ่านรูปนี้ไม่ได้ ลองถ่ายใหม่ให้เห็นสลิปเต็มใบ', 400, false);
    case 413:
      return new OcrError('รูปใหญ่เกิน 10 MB ย่อขนาดก่อนแล้วลองใหม่', 413, false);
    case 415:
      return new OcrError('ไฟล์นี้ไม่ใช่รูปภาพ', 415, false);
    case 503:
      return new OcrError('บริการอ่านสลิปไม่ตอบสนอง เดี๋ยวลองใหม่ให้', 503, true);
    default:
      return new OcrError(`บริการอ่านสลิปตอบกลับผิดพลาด (${status})`, status, status >= 500);
  }
}

function filenameFor(uri: string): string {
  const last = uri.split('/').pop();
  return last && last.includes('.') ? last : 'slip.jpg';
}

/** Sends one slip image to the OCR service and returns the parsed fields. */
export async function parseSlip(imageUri: string): Promise<OcrResult> {
  const base = requireEnv('EXPO_PUBLIC_OCR_BASE_URL', ocrBaseUrl).replace(/\/+$/, '');
  const name = filenameFor(imageUri);

  // The `{uri, name, type}` object that React Native took for years is
  // rejected by 0.86's networking with "Unsupported FormDataPart
  // implementation" — the failure surfaces as a generic fetch rejection, which
  // reads exactly like the server being unreachable. `expo-file-system`'s
  // `File` implements `Blob`, which is what the current FormData wants.
  const body = new FormData();
  body.append('file', new File(imageUri), name);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${base}/api/v1/ocr/parse`, {
      method: 'POST',
      body,
      signal: controller.signal,
    });
  } catch (cause) {
    const aborted = cause instanceof Error && cause.name === 'AbortError';
    if (aborted) {
      throw new OcrError('อ่านสลิปนานเกินไป ลองใหม่อีกครั้ง', null, true);
    }
    // `fetch` reports a rejected connection and a file it could not read with
    // the same opaque "Network request failed", so carry the underlying text
    // and the image scheme through — the difference decides whether to go
    // looking at the network or at the picker.
    const detail = cause instanceof Error ? cause.message : String(cause);
    const scheme = imageUri.split(':')[0];
    throw new OcrError(
      `ส่งไป ${base} ไม่สำเร็จ (${detail}) · รูปเป็น ${scheme}: · ตรวจว่า service รันด้วย --host 0.0.0.0 และเครื่องต่อถึงกันได้`,
      null,
      true
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) throw describe(response.status);

  return (await response.json()) as OcrResult;
}
