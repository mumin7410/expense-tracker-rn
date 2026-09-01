import { StyleSheet, Text, View } from 'react-native';

import type { TransactionWithCategory } from '@/db/types';
import { baht, shortDateTime } from '@/lib/format';
import { categoryIcon } from '@/theme/icons';
import { alpha, color, space, type } from '@/theme/tokens';

/**
 * One transaction as it appears in every list.
 *
 * A row with no category is tinted warm rather than hidden — the expense
 * counted towards the total the moment it was saved, and the missing category
 * is a to-do, not an error.
 */
export function TransactionRow({ row }: { row: TransactionWithCategory }) {
  const Icon = categoryIcon(row.category?.icon);
  const uncategorised = !row.category;

  return (
    <View style={styles.row}>
      <View style={[styles.icon, uncategorised && styles.iconWarn]}>
        <Icon
          size={19}
          strokeWidth={1.7}
          color={uncategorised ? color.warnInk : color.accentInk}
        />
      </View>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {row.recipient_name ?? 'ไม่ทราบผู้รับ'}
        </Text>
        <Text style={[styles.meta, uncategorised && styles.metaWarn]} numberOfLines={1}>
          {row.category?.name ?? 'ยังไม่มีหมวด'} · {row.bank_code ?? 'ไม่รู้จักธนาคาร'} ·{' '}
          {shortDateTime(new Date(row.transaction_date))}
        </Text>
      </View>
      <Text style={styles.amount}>{baht(row.amount)}</Text>
    </View>
  );
}

/** The divider between rows, inset to line up under the text. */
export function TransactionRowDivider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 66,
    backgroundColor: alpha.hairline,
  },
  icon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: alpha.accentWash,
  },
  iconWarn: {
    backgroundColor: alpha.warnWash,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...type.rowTitle,
    color: color.text,
  },
  meta: {
    ...type.meta,
    color: color.textSubtle,
  },
  metaWarn: {
    color: color.warnMeta,
  },
  amount: {
    ...type.amountRow,
    color: color.text,
  },
});
