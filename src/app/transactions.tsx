import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenBackground } from '@/components/screen-background';
import { Surface } from '@/components/surface';
import { useMonthTransactions } from '@/features/transactions/queries';
import {
  TransactionRow,
  TransactionRowDivider,
} from '@/features/transactions/transaction-row';
import { baht, monthYear } from '@/lib/format';
import { color, radius, space, statusBarInset, type } from '@/theme/tokens';

/** Every slip in the current month. The home screen only shows the newest few. */
export default function TransactionsScreen() {
  const router = useRouter();
  const month = useMemo(() => new Date(), []);
  const { data, isPending } = useMonthTransactions(month);

  const rows = data ?? [];
  const total = rows.reduce((sum, row) => sum + Number(row.amount), 0);

  return (
    <ScreenBackground>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ย้อนกลับ"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <ChevronLeft size={20} strokeWidth={2} color={color.textSecondary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>{monthYear(month)}</Text>
          <Text style={styles.subtitle}>
            {rows.length} สลิป · {baht(total)}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {isPending ? (
          <ActivityIndicator color={color.accent} style={styles.loading} />
        ) : (
          <Surface variant="flat" cornerRadius={radius.card} style={styles.list}>
            {rows.map((row, index) => (
              <View key={row.id}>
                {index > 0 ? <TransactionRowDivider /> : null}
                <TransactionRow row={row} />
              </View>
            ))}
          </Surface>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingTop: statusBarInset,
    paddingHorizontal: space.xl,
    paddingBottom: space.md,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.62)',
  },
  pressed: {
    opacity: 0.7,
  },
  headerText: {
    gap: 1,
  },
  title: {
    ...type.screenTitle,
    color: color.text,
  },
  subtitle: {
    ...type.meta,
    color: color.textMuted,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: space.xl,
    paddingBottom: 40,
  },
  loading: {
    paddingVertical: 30,
  },
  list: {
    overflow: 'hidden',
  },
});
