import type { TransactionWithCategory } from '@/db/types';
import { color } from '@/theme/tokens';

/** Largest slice first, so the ramp reads as a ranking. */
const BAR_COLORS = [color.barAccent1, color.barAccent2, color.barAccent3, color.barAccent4];

export type Summary = {
  total: number;
  bankCount: number;
  pendingTotal: number;
  pendingCount: number;
  slices: { key: string; label: string; amount: number; fill: string }[];
};

/**
 * Shared by the home screen and the widget/notification, so a month total
 * can never read differently in two places.
 */
export function summarise(rows: TransactionWithCategory[]): Summary {
  let total = 0;
  let pendingTotal = 0;
  let pendingCount = 0;
  const byCategory = new Map<string, { label: string; amount: number }>();
  const banks = new Set<string>();

  for (const row of rows) {
    const value = Number(row.amount);
    total += value;
    if (row.bank_code) banks.add(row.bank_code);

    if (!row.category) {
      pendingTotal += value;
      pendingCount += 1;
      continue;
    }

    const existing = byCategory.get(row.category.id);
    if (existing) existing.amount += value;
    else byCategory.set(row.category.id, { label: row.category.name, amount: value });
  }

  const ranked = [...byCategory.entries()]
    .map(([key, entry]) => ({ key, ...entry }))
    .sort((a, b) => b.amount - a.amount);

  const slices: Summary['slices'] = [];
  if (pendingTotal > 0) {
    slices.push({
      key: 'pending',
      label: 'ยังไม่จัดหมวด',
      amount: pendingTotal,
      fill: color.barNeutral,
    });
  }
  ranked.forEach((entry, index) => {
    slices.push({ ...entry, fill: BAR_COLORS[Math.min(index, BAR_COLORS.length - 1)] });
  });

  return { total, bankCount: banks.size, pendingTotal, pendingCount, slices };
}
