import type { SlipType } from '@/lib/ocr';

/**
 * Mirrors `public.transactions` in supabase/migrations/0001_schema.sql.
 *
 * `amount` and `fee` are `numeric` in Postgres and come back as strings from
 * PostgREST. Keeping them as strings all the way to the formatter means no
 * float rounding is ever introduced on the way through.
 */
export type Transaction = {
  id: string;
  user_id: string;
  type: 'expense';
  /** Null when OCR could not identify the bank. The row still counts. */
  bank_code: string | null;
  slip_type: SlipType | null;
  amount: string;
  fee: string | null;
  sender_name: string | null;
  sender_account: string | null;
  recipient_name: string | null;
  recipient_account: string | null;
  transaction_ref: string | null;
  /** Written by a trigger. Never sent by the app. */
  dedup_key: string | null;
  category_id: string | null;
  transaction_date: string;
  /** False until the user has seen the category and accepted it. */
  is_confirmed: boolean;
  raw_ocr_text: string | null;
  created_at: string;
};

/** Mirrors `public.categories`. A null `user_id` marks a shared default. */
export type Category = {
  id: string;
  user_id: string | null;
  name: string;
  icon: string | null;
  keywords: string[];
  sort_order: number;
};

/**
 * Exactly the columns the app is allowed to write.
 *
 * Four are deliberately absent because Postgres triggers own them, and sending
 * them either gets overwritten or fights the trigger:
 *   - `dedup_key` — set by `set_transaction_dedup_key()`
 *   - `category_id` / `is_confirmed` — set by `transactions_auto_categorise`
 *   - anything in `recipient_category_map` — written on confirm
 */
export type TransactionInsert = {
  user_id: string;
  amount: string;
  transaction_date: string;
  bank_code: string | null;
  slip_type: SlipType | null;
  fee: string | null;
  sender_name: string | null;
  sender_account: string | null;
  recipient_name: string | null;
  recipient_account: string | null;
  transaction_ref: string | null;
  /** Always sent. The only way to debug a slip that parsed wrong. */
  raw_ocr_text: string;
};

/** A transaction with its category joined, as the lists render it. */
export type TransactionWithCategory = Transaction & {
  category: Pick<Category, 'id' | 'name' | 'icon'> | null;
};
