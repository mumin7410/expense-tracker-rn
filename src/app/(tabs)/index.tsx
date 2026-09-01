import { ChevronRight, CloudUpload, ImageUp, TriangleAlert } from 'lucide-react-native';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenBackground } from '@/components/screen-background';
import { Surface } from '@/components/surface';
import type { TransactionWithCategory } from '@/db/types';
import { useMonthTransactions } from '@/features/transactions/queries';
import {
  TransactionRow,
  TransactionRowDivider,
} from '@/features/transactions/transaction-row';
import { baht, monthYear } from '@/lib/format';
import { useQueueSize } from '@/queue/use-queue';
import { alpha, color, radius, space, statusBarInset, type } from '@/theme/tokens';

/** Largest slice first, so the ramp reads as a ranking. */
const BAR_COLORS = [color.barAccent1, color.barAccent2, color.barAccent3, color.barAccent4];

type Summary = {
  total: number;
  bankCount: number;
  pendingTotal: number;
  pendingCount: number;
  slices: { key: string; label: string; amount: number; fill: string }[];
};

function summarise(rows: TransactionWithCategory[]): Summary {
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

export default function HomeScreen() {
  const router = useRouter();
  const now = useMemo(() => new Date(), []);
  const { data, isPending, error } = useMonthTransactions(now);
  const { data: queued } = useQueueSize();

  const rows = data ?? [];
  const summary = useMemo(() => summarise(rows), [rows]);
  const recent = rows.slice(0, 4);

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>รายจ่ายเดือนนี้</Text>
          <Text style={styles.month}>{monthYear(now)}</Text>
        </View>

        <Surface cornerRadius={radius.cardLarge} style={styles.hero}>
          {isPending ? (
            <ActivityIndicator color={color.accent} style={styles.heroLoading} />
          ) : (
            <>
              <Text style={styles.amount}>{baht(summary.total)}</Text>
              <Text style={styles.heroMeta}>
                {rows.length === 0
                  ? 'ยังไม่มีสลิปในเดือนนี้'
                  : `จาก ${rows.length} สลิป${
                      summary.bankCount > 0 ? ` · ${summary.bankCount} ธนาคาร` : ''
                    }`}
              </Text>

              {summary.slices.length > 0 ? (
                <>
                  <View style={styles.bar}>
                    {summary.slices.map((slice) => (
                      <View
                        key={slice.key}
                        style={[
                          styles.barSegment,
                          {
                            flexGrow: slice.amount,
                            backgroundColor: slice.fill,
                          },
                        ]}
                      />
                    ))}
                  </View>

                  <View style={styles.legend}>
                    {summary.slices.slice(0, 3).map((slice) => (
                      <View key={slice.key} style={styles.legendRow}>
                        <View style={[styles.dot, { backgroundColor: slice.fill }]} />
                        <Text style={styles.legendLabel} numberOfLines={1}>
                          {slice.label}
                        </Text>
                        <Text style={styles.legendAmount}>{baht(slice.amount)}</Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}
            </>
          )}
        </Surface>

        {error ? (
          <Surface variant="flat" cornerRadius={radius.control} style={styles.notice}>
            <TriangleAlert size={17} strokeWidth={1.8} color={color.warn} />
            <Text style={styles.noticeText}>
              {error instanceof Error ? error.message : 'โหลดรายการไม่สำเร็จ'}
            </Text>
          </Surface>
        ) : null}

        {queued && queued > 0 ? (
          <Surface variant="flat" cornerRadius={radius.control} style={styles.queued}>
            <View style={styles.queuedIcon}>
              <CloudUpload size={18} strokeWidth={1.8} color={color.textMuted} />
            </View>
            <View style={styles.queuedText}>
              <Text style={styles.queuedTitle}>{queued} สลิปรออัปโหลด</Text>
              <Text style={styles.queuedMeta}>จะส่งให้เองเมื่อกลับมาต่อได้</Text>
            </View>
          </Surface>
        ) : null}

        {summary.pendingCount > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/pending')}
            style={({ pressed }) => pressed && styles.pressed}>
            <View style={styles.pendingCard}>
              <View style={styles.pendingIcon}>
                <TriangleAlert size={19} strokeWidth={1.8} color={color.warnInk} />
              </View>
              <View style={styles.pendingText}>
                <Text style={styles.pendingTitle}>
                  {summary.pendingCount} รายการยังไม่มีหมวด
                </Text>
                <Text style={styles.pendingMeta}>
                  {baht(summary.pendingTotal)} · แตะเพื่อจัดหมวด
                </Text>
              </View>
              <ChevronRight size={18} strokeWidth={2} color={color.warnMeta} />
            </View>
          </Pressable>
        ) : null}

        {recent.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>รายการล่าสุด</Text>
              {rows.length > recent.length ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/transactions')}
                  style={({ pressed }) => pressed && styles.pressed}>
                  <Text style={styles.seeAll}>ดูทั้งหมด</Text>
                </Pressable>
              ) : null}
            </View>
            <Surface variant="flat" cornerRadius={radius.card} style={styles.list}>
              {recent.map((row, index) => (
                <View key={row.id}>
                  {index > 0 ? <TransactionRowDivider /> : null}
                  <TransactionRow row={row} />
                </View>
              ))}
            </Surface>
          </>
        ) : null}

        {!isPending && rows.length === 0 ? (
          <Surface variant="flat" cornerRadius={radius.control} style={styles.invite}>
            <View style={styles.inviteIcon}>
              <ImageUp size={19} strokeWidth={1.7} color={color.accentInk} />
            </View>
            <Text style={styles.inviteText}>
              เลือกรูปสลิปจากปุ่มมุมขวาล่าง แอพจะอ่านยอดและวันที่ให้
            </Text>
          </Surface>
        ) : null}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: statusBarInset,
    paddingHorizontal: space.xl,
    paddingBottom: 120,
    gap: space.lg,
  },
  header: {
    gap: 2,
  },
  eyebrow: {
    ...type.label,
    color: color.textMuted,
    letterSpacing: 0.2,
  },
  month: {
    ...type.screenTitle,
    color: color.text,
  },
  hero: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 20,
    gap: space.lg,
  },
  heroLoading: {
    paddingVertical: 26,
  },
  amount: {
    ...type.amountHero,
    color: color.text,
  },
  heroMeta: {
    ...type.label,
    marginTop: -12,
    color: color.textMuted,
  },
  bar: {
    flexDirection: 'row',
    gap: 3,
    height: 10,
  },
  barSegment: {
    flexBasis: 0,
    flexShrink: 1,
    borderRadius: radius.pill,
  },
  legend: {
    gap: space.sm,
    marginTop: -4,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
  },
  legendLabel: {
    ...type.label,
    flex: 1,
    color: color.textSecondary,
  },
  legendAmount: {
    ...type.label,
    fontFamily: type.headline.fontFamily,
    color: color.text,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: 13,
  },
  noticeText: {
    ...type.meta,
    flex: 1,
    color: color.warnText,
  },
  pressed: {
    opacity: 0.8,
  },
  queued: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: 13,
  },
  queuedIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: color.iconWell,
  },
  queuedText: {
    flex: 1,
    gap: 1,
  },
  queuedTitle: {
    ...type.rowTitle,
    fontSize: 13.5,
    color: color.text,
  },
  queuedMeta: {
    ...type.caption,
    color: color.textSubtle,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: 13,
    borderRadius: 24,
    backgroundColor: alpha.warnPanel,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: alpha.warnBorder,
    boxShadow: '0px 10px 26px -16px rgba(154,62,0,0.40)',
  },
  pendingIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: alpha.warnWash,
  },
  pendingText: {
    flex: 1,
    gap: 1,
  },
  pendingTitle: {
    ...type.rowTitle,
    fontSize: 14.5,
    color: color.text,
  },
  pendingMeta: {
    ...type.caption,
    color: color.warnText,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: -8,
    paddingHorizontal: 4,
  },
  seeAll: {
    ...type.label,
    color: color.accent,
  },
  sectionLabel: {
    ...type.label,
    fontFamily: type.headline.fontFamily,
    fontSize: 13,
    color: color.textMuted,
  },
  list: {
    overflow: 'hidden',
  },
  invite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: 13,
  },
  inviteIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: alpha.accentWash,
  },
  inviteText: {
    ...type.meta,
    flex: 1,
    color: color.textSecondary,
  },
});
