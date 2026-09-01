import { Check, Inbox, TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ScreenBackground } from '@/components/screen-background';
import { Surface } from '@/components/surface';
import type { Category, TransactionWithCategory } from '@/db/types';
import { useCategories } from '@/features/categories/queries';
import { useConfirmCategory, usePendingTransactions } from '@/features/transactions/queries';
import { baht, fullDateTime } from '@/lib/format';
import { categoryIcon } from '@/theme/icons';
import { alpha, color, radius, space, statusBarInset, type } from '@/theme/tokens';

export default function PendingScreen() {
  const { data: pending, isPending: loadingRows } = usePendingTransactions();
  const { data: categories } = useCategories();
  const confirm = useConfirmCategory();
  const [picked, setPicked] = useState<string | null>(null);

  const rows = pending ?? [];
  const focus = rows[0];
  const next = rows[1];
  const pickedCategory = categories?.find((entry) => entry.id === picked);

  const onConfirm = async () => {
    if (!focus || !picked) return;
    await confirm.mutateAsync({ transactionId: focus.id, categoryId: picked });
    // The list refetches and the next slip takes the focus slot, so the
    // selection has to be cleared or it would carry over to a new recipient.
    setPicked(null);
  };

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>รอจัดหมวด</Text>
          {rows.length > 0 ? (
            <View style={styles.count}>
              <Text style={styles.countLabel}>{rows.length}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.subtitle}>เลือกหมวดครั้งเดียว ครั้งหน้าผู้รับเดิมจัดให้เอง</Text>

        {loadingRows ? (
          <Surface cornerRadius={radius.card} style={styles.empty}>
            <ActivityIndicator color={color.accent} />
          </Surface>
        ) : null}

        {!loadingRows && !focus ? (
          <Surface cornerRadius={radius.card} style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Inbox size={22} strokeWidth={1.6} color={color.accentInk} />
            </View>
            <Text style={styles.emptyTitle}>ไม่มีรายการค้าง</Text>
            <Text style={styles.emptyBody}>สลิปที่แอพจัดหมวดให้ไม่ได้จะมารออยู่ที่นี่</Text>
          </Surface>
        ) : null}

        {focus ? (
          <>
            <FocusCard row={focus} position={1} total={rows.length} />

            <Text style={styles.sectionLabel}>เลือกหมวด</Text>
            <View style={styles.grid}>
              {(categories ?? []).map((category) => (
                <CategoryChip
                  key={category.id}
                  category={category}
                  selected={picked === category.id}
                  onPress={() => setPicked(category.id)}
                />
              ))}
            </View>

            {confirm.error ? (
              <Surface variant="flat" cornerRadius={radius.control} style={styles.notice}>
                <TriangleAlert size={17} strokeWidth={1.8} color={color.warn} />
                <Text style={styles.noticeText}>
                  {confirm.error instanceof Error ? confirm.error.message : 'บันทึกไม่สำเร็จ'}
                </Text>
              </Surface>
            ) : null}

            {next ? (
              <View style={styles.nextRow}>
                <Text style={styles.nextLabel}>ถัดไป</Text>
                <Text style={styles.nextValue} numberOfLines={1}>
                  {baht(next.amount)} · {next.recipient_name ?? 'ไม่ทราบผู้รับ'}
                </Text>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {focus ? (
        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !picked || confirm.isPending }}
            disabled={!picked || confirm.isPending}
            onPress={onConfirm}
            style={({ pressed }) => [
              styles.save,
              !picked && styles.saveDisabled,
              pressed && styles.savePressed,
            ]}>
            {confirm.isPending ? (
              <ActivityIndicator color={color.white} />
            ) : (
              <Text style={styles.saveLabel}>
                {pickedCategory ? `บันทึกเป็น ${pickedCategory.name}` : 'เลือกหมวดก่อน'}
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </ScreenBackground>
  );
}

function FocusCard({
  row,
  position,
  total,
}: {
  row: TransactionWithCategory;
  position: number;
  total: number;
}) {
  return (
    <Surface cornerRadius={radius.card} style={styles.focus}>
      <View style={styles.focusHead}>
        <View style={styles.bankBadge}>
          <Text style={styles.bankCode}>{row.bank_code ?? '?'}</Text>
        </View>
        <Text style={styles.focusMeta} numberOfLines={1}>
          {fullDateTime(new Date(row.transaction_date))}
        </Text>
        <Text style={styles.focusPosition}>
          {position} / {total}
        </Text>
      </View>

      <View style={styles.focusBody}>
        <View style={styles.focusText}>
          <Text style={styles.focusName} numberOfLines={1}>
            {row.recipient_name ?? 'ไม่ทราบผู้รับ'}
          </Text>
          {row.recipient_account ? (
            <Text style={styles.focusAccount}>บัญชี •• {row.recipient_account}</Text>
          ) : null}
        </View>
        <Text style={styles.focusAmount}>{baht(row.amount)}</Text>
      </View>
    </Surface>
  );
}

function CategoryChip({
  category,
  selected,
  onPress,
}: {
  category: Category;
  selected: boolean;
  onPress: () => void;
}) {
  const Icon = categoryIcon(category.icon);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={category.name}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}>
      {selected ? (
        <View style={styles.chipCheck}>
          <Check size={12} strokeWidth={3} color={color.white} />
        </View>
      ) : null}
      <Icon
        size={20}
        strokeWidth={selected ? 1.8 : 1.7}
        color={selected ? color.accentInkDeep : color.textSecondary}
      />
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]} numberOfLines={2}>
        {category.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: statusBarInset,
    paddingHorizontal: space.xl,
    paddingBottom: 130,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  title: {
    ...type.title,
    color: color.text,
  },
  count: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: color.warn,
  },
  countLabel: {
    ...type.caption,
    fontFamily: type.headline.fontFamily,
    fontSize: 12.5,
    color: color.white,
  },
  subtitle: {
    ...type.label,
    marginTop: space.xs,
    color: color.textMuted,
  },
  empty: {
    marginTop: space.lg,
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.xl,
    paddingVertical: 28,
  },
  emptyIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.row,
    backgroundColor: alpha.accentWash,
  },
  emptyTitle: {
    ...type.rowTitle,
    color: color.text,
  },
  emptyBody: {
    ...type.meta,
    textAlign: 'center',
    color: color.textMuted,
  },
  focus: {
    marginTop: space.lg,
    gap: space.md,
    paddingHorizontal: 18,
    paddingTop: space.lg,
    paddingBottom: 18,
  },
  focusHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  bankBadge: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: alpha.accentWash,
  },
  bankCode: {
    fontFamily: type.tab.fontFamily,
    fontSize: 9,
    color: color.accentInk,
  },
  focusMeta: {
    ...type.meta,
    flex: 1,
    color: color.textMuted,
  },
  focusPosition: {
    ...type.caption,
    color: color.textFaint,
  },
  focusBody: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.md,
  },
  focusText: {
    flex: 1,
    gap: 5,
  },
  focusName: {
    ...type.headline,
    fontSize: 16.5,
    color: color.text,
  },
  focusAccount: {
    ...type.meta,
    color: color.textMuted,
  },
  focusAmount: {
    ...type.amountLarge,
    fontSize: 27,
    color: color.text,
  },
  sectionLabel: {
    ...type.label,
    marginTop: 18,
    marginBottom: 10,
    fontFamily: type.headline.fontFamily,
    color: color.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    width: '31.5%',
    height: 74,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 4,
    borderRadius: 20,
    backgroundColor: alpha.glassSoft,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: alpha.glassBorder,
  },
  chipSelected: {
    backgroundColor: alpha.accentWash,
    borderColor: alpha.accentEdgeWash,
    boxShadow: '0px 10px 24px -12px rgba(53,82,188,0.45)',
  },
  chipCheck: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: color.accent,
    borderWidth: 2,
    borderColor: color.bg,
  },
  chipLabel: {
    ...type.caption,
    fontSize: 10.5,
    lineHeight: 14,
    textAlign: 'center',
    color: color.textSecondary,
  },
  chipLabelSelected: {
    fontFamily: type.headline.fontFamily,
    color: color.accentInkDeep,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    marginTop: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: 13,
  },
  noticeText: {
    ...type.meta,
    flex: 1,
    color: color.warnText,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.lg,
    paddingHorizontal: 4,
  },
  nextLabel: {
    ...type.meta,
    color: color.textSubtle,
  },
  nextValue: {
    ...type.meta,
    flex: 1,
    color: color.textSecondary,
  },
  footer: {
    position: 'absolute',
    left: space.xl,
    right: space.xl,
    bottom: 100,
  },
  save: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: color.accent,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.accentEdge,
    boxShadow: '0px 16px 34px -14px rgba(53,82,188,0.60)',
  },
  savePressed: {
    backgroundColor: color.accentPressed,
  },
  saveDisabled: {
    opacity: 0.45,
  },
  saveLabel: {
    ...type.headline,
    fontSize: 16,
    letterSpacing: -0.1,
    color: color.white,
  },
});
