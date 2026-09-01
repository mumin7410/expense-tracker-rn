import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { TransactionInsert, TransactionWithCategory } from '@/db/types';
import { useAuth } from '@/lib/auth';
import type { ParsedSlip } from '@/lib/ocr';
import { supabase } from '@/lib/supabase';

/** Everything the lists need, with the category joined in one round trip. */
const SELECT = '*, category:categories(id, name, icon)';

export const transactionKeys = {
  all: ['transactions'] as const,
  month: (month: string) => ['transactions', 'month', month] as const,
  pending: () => ['transactions', 'pending'] as const,
};

/** `2026-08` — the key the month queries are cached under. */
export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthRange(date: Date): { from: string; to: string } {
  const from = new Date(date.getFullYear(), date.getMonth(), 1);
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

/** Every transaction in one month, newest first. */
export function useMonthTransactions(month: Date) {
  const { session } = useAuth();

  return useQuery({
    queryKey: transactionKeys.month(monthKey(month)),
    enabled: Boolean(session),
    queryFn: async (): Promise<TransactionWithCategory[]> => {
      const { from, to } = monthRange(month);
      const { data, error } = await supabase
        .from('transactions')
        .select(SELECT)
        .gte('transaction_date', from)
        .lt('transaction_date', to)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as TransactionWithCategory[];
    },
  });
}

/**
 * Slips the triggers could not categorise. Backed by
 * `transactions_user_pending_idx`, which is partial on `category_id is null`.
 */
export function usePendingTransactions() {
  const { session } = useAuth();

  return useQuery({
    queryKey: transactionKeys.pending(),
    enabled: Boolean(session),
    queryFn: async (): Promise<TransactionWithCategory[]> => {
      const { data, error } = await supabase
        .from('transactions')
        .select(SELECT)
        .is('category_id', null)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as TransactionWithCategory[];
    },
  });
}

/** Postgres unique violation — here, `(user_id, dedup_key)`. */
const UNIQUE_VIOLATION = '23505';

export type SaveOutcome =
  | { status: 'saved'; transaction: TransactionWithCategory }
  | { status: 'duplicate' };

/**
 * Turns a parsed slip into a row.
 *
 * A duplicate is **success**, not an error: the unique index on
 * `(user_id, dedup_key)` means this exact slip is already stored, so there is
 * nothing left to do and nothing to retry.
 */
export function useSaveSlip() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      parsed,
      rawText,
      overrides,
    }: {
      parsed: ParsedSlip;
      rawText: string;
      /** What the user corrected on the review screen. */
      overrides?: Partial<Pick<TransactionInsert, 'amount' | 'recipient_name'>>;
    }): Promise<SaveOutcome> => {
      const userId = session?.user.id;
      if (!userId) throw new Error('ยังไม่ได้เข้าสู่ระบบ');
      if (!parsed.amount || !parsed.transaction_date) {
        throw new Error('สลิปนี้ไม่มียอดเงินหรือวันที่ บันทึกไม่ได้');
      }

      const row: TransactionInsert = {
        user_id: userId,
        amount: overrides?.amount ?? parsed.amount,
        transaction_date: parsed.transaction_date,
        bank_code: parsed.bank_code,
        slip_type: parsed.slip_type,
        fee: parsed.fee,
        sender_name: parsed.sender_name,
        sender_account: parsed.sender_account,
        recipient_name: overrides?.recipient_name ?? parsed.recipient_name,
        recipient_account: parsed.recipient_account,
        transaction_ref: parsed.transaction_ref,
        raw_ocr_text: rawText,
      };

      const { data, error } = await supabase
        .from('transactions')
        .insert(row)
        .select(SELECT)
        .single();

      if (error) {
        if (error.code === UNIQUE_VIOLATION) return { status: 'duplicate' };
        throw error;
      }

      return {
        status: 'saved',
        transaction: data as unknown as TransactionWithCategory,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}

/**
 * Accepts a category for a transaction.
 *
 * Both fields go in one patch on purpose. `transactions_learn_category` fires
 * `when (new.is_confirmed and new.category_id is not null)` — set the category
 * without the flag and the row looks right while the app quietly stops
 * learning, so the same recipient asks again forever.
 */
export function useConfirmCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transactionId,
      categoryId,
    }: {
      transactionId: string;
      categoryId: string;
    }): Promise<TransactionWithCategory> => {
      const { data, error } = await supabase
        .from('transactions')
        .update({ category_id: categoryId, is_confirmed: true })
        .eq('id', transactionId)
        .select(SELECT)
        .single();

      if (error) throw error;
      return data as unknown as TransactionWithCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}
