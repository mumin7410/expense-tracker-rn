import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, CloudUpload, TriangleAlert, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ScreenBackground } from '@/components/screen-background';
import { Surface } from '@/components/surface';
import { useSaveSlip } from '@/features/transactions/queries';
import { baht, fullDateTime } from '@/lib/format';
import { OcrError, parseSlip, type ParsedSlip, type SlipType } from '@/lib/ocr';
import { enqueue } from '@/queue/queue';
import { queueKeys } from '@/queue/use-queue';
import { alpha, color, radius, space, statusBarInset, type } from '@/theme/tokens';

/**
 * Puts the slip in the upload queue and leaves. Used wherever the network or
 * the OCR service is the thing that failed — the slip is the user's only
 * record of the expense, so it is never dropped on their behalf.
 */
function useKeepForLater() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return async (input: Parameters<typeof enqueue>[0]) => {
    await enqueue(input);
    queryClient.invalidateQueries({ queryKey: queueKeys.size });
    router.back();
  };
}

const SLIP_TYPE_LABEL: Record<SlipType, string> = {
  transfer: 'โอนเงิน',
  bill_payment: 'จ่ายบิล',
  topup: 'เติมเงิน',
};

export default function ReviewScreen() {
  const router = useRouter();
  const { uri } = useLocalSearchParams<{ uri?: string }>();

  const { data, error, isPending, refetch, isRefetching } = useQuery({
    queryKey: ['ocr', uri],
    queryFn: () => parseSlip(uri!),
    enabled: Boolean(uri),
    // Only a service that is down deserves another attempt with the same
    // bytes; a rejected image will be rejected identically every time.
    retry: (attempt, cause) => cause instanceof OcrError && cause.retryable && attempt < 2,
    staleTime: Infinity,
  });

  return (
    <ScreenBackground>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ปิด"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
          <X size={18} strokeWidth={2} color={color.textSecondary} />
        </Pressable>
        <Text style={styles.title}>ตรวจก่อนบันทึก</Text>
      </View>

      {isPending ? (
        <View style={styles.centered}>
          <Reading />
        </View>
      ) : null}

      {error ? (
        <View style={styles.centered}>
          <Failure
            message={error instanceof Error ? error.message : 'อ่านสลิปไม่สำเร็จ'}
            canRetry={!(error instanceof OcrError) || error.retryable}
            isRetrying={isRefetching}
            onRetry={refetch}
            imageUri={uri}
          />
        </View>
      ) : null}

      {data ? (
        <SlipForm parsed={data.parsed} rawText={data.text} imageUri={uri} />
      ) : null}
    </ScreenBackground>
  );
}

function Reading() {
  return (
    <Surface cornerRadius={radius.cardLarge} style={styles.status}>
      <ActivityIndicator color={color.accent} />
      <Text style={styles.statusTitle}>กำลังอ่านสลิป</Text>
      <Text style={styles.statusBody}>
        ttb และ UOB ราว 1 วินาที · SCB และ K PLUS ราว 5 วินาที เพราะต้องอ่านรอบสองเพื่อดึงรหัสอ้างอิง
      </Text>
    </Surface>
  );
}

function Failure({
  message,
  canRetry,
  isRetrying,
  onRetry,
  imageUri,
}: {
  message: string;
  canRetry: boolean;
  isRetrying: boolean;
  onRetry: () => void;
  imageUri?: string;
}) {
  const keepForLater = useKeepForLater();

  return (
    <Surface cornerRadius={radius.cardLarge} style={styles.status}>
      <TriangleAlert size={22} strokeWidth={1.7} color={color.warn} />
      <Text style={styles.statusTitle}>อ่านสลิปไม่สำเร็จ</Text>
      <Text style={styles.statusBody}>{message}</Text>
      {canRetry ? (
        <View style={styles.statusActions}>
          <Pressable
            accessibilityRole="button"
            disabled={isRetrying}
            onPress={onRetry}
            style={({ pressed }) => [styles.retry, pressed && styles.pressed]}>
            <Text style={styles.retryLabel}>{isRetrying ? 'กำลังลองใหม่' : 'ลองใหม่'}</Text>
          </Pressable>
          {imageUri ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => keepForLater({ imageUri, lastError: message })}
              style={({ pressed }) => [styles.keep, pressed && styles.pressed]}>
              <CloudUpload size={16} strokeWidth={1.9} color={color.textSecondary} />
              <Text style={styles.keepLabel}>เก็บไว้ส่งทีหลัง</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Surface>
  );
}

function SlipForm({
  parsed,
  rawText,
  imageUri,
}: {
  parsed: ParsedSlip;
  rawText: string;
  imageUri?: string;
}) {
  const router = useRouter();
  const save = useSaveSlip();
  const keepForLater = useKeepForLater();

  // Seeded from OCR, then owned by the user. The recipient name in particular
  // is a guess the app is expected to get wrong on bold Thai text.
  const [amount, setAmount] = useState(parsed.amount ?? '');
  const [recipientName, setRecipientName] = useState(parsed.recipient_name ?? '');

  const date = parsed.transaction_date ? new Date(parsed.transaction_date) : null;
  const canSave = Boolean(parsed.transaction_date) && amount.trim().length > 0;

  const onSave = async () => {
    // A failed save is not an exception here — `save.error` drives the retry
    // and "เก็บไว้ส่งทีหลัง" panel below, which is how the slip survives a
    // dead network. Without this catch the rejection from mutateAsync goes
    // unhandled and Android logs it as a crash-looking error while the screen
    // is in fact working as designed.
    const outcome = await save
      .mutateAsync({
        parsed,
        rawText,
        overrides: { amount: amount.trim(), recipient_name: recipientName.trim() || null },
      })
      .catch(() => null);
    if (!outcome) return;

    // A duplicate means the slip is already stored, so the user is done either
    // way and the screen closes on both.
    if (outcome.status === 'saved' || outcome.status === 'duplicate') router.back();
  };

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Surface cornerRadius={radius.cardLarge} style={styles.slip}>
          <View style={styles.bankRow}>
            <View style={styles.bankBadge}>
              <Text style={styles.bankCode}>{parsed.bank_code ?? '?'}</Text>
            </View>
            <Text style={styles.bankName} numberOfLines={1}>
              {parsed.bank_name ?? 'ไม่รู้จักธนาคารนี้'}
            </Text>
            {parsed.slip_type ? (
              <View style={styles.typeChip}>
                <Text style={styles.typeChipLabel}>{SLIP_TYPE_LABEL[parsed.slip_type]}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.amountField}>
            <View style={styles.amountText}>
              <Text style={styles.amountLabel}>ยอดเงิน</Text>
              <View style={styles.amountInputRow}>
                <Text style={styles.currency}>฿</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                  accessibilityLabel="ยอดเงิน"
                  style={styles.amountInput}
                />
              </View>
            </View>
            <View style={styles.feeText}>
              <Text style={styles.feeLabel}>ค่าธรรมเนียม</Text>
              <Text style={styles.fee}>{parsed.fee ? baht(parsed.fee) : '—'}</Text>
            </View>
          </View>
        </Surface>

        <Surface cornerRadius={radius.card} style={styles.fields}>
          <Field label="วันและเวลา" value={date ? fullDateTime(date) : 'อ่านไม่ได้'} />
          <Hairline />
          <View style={styles.recipientBlock}>
            <View style={styles.row}>
              <Text style={styles.fieldLabel}>ผู้รับ</Text>
              <TextInput
                value={recipientName}
                onChangeText={setRecipientName}
                placeholder="ใส่ชื่อผู้รับ"
                placeholderTextColor={color.textFaint}
                accessibilityLabel="ชื่อผู้รับ"
                style={styles.recipientInput}
              />
            </View>
            <View style={styles.recipientNote}>
              <TriangleAlert size={13} strokeWidth={2} color={color.warn} />
              <Text style={styles.recipientNoteText}>
                ชื่อไทยตัวหนามักอ่านเพี้ยน แก้ให้ตรงได้เลย
              </Text>
            </View>
          </View>
          <Hairline />
          <Field label="เลขบัญชีผู้รับ" value={parsed.recipient_account ?? 'อ่านไม่ได้'} />
          <Hairline />
          <Field label="เลขอ้างอิง" value={parsed.transaction_ref ?? 'อ่านไม่ได้'} />
        </Surface>

        {parsed.missing_fields.length > 0 ? (
          <Surface variant="flat" cornerRadius={radius.control} style={styles.missing}>
            <TriangleAlert size={17} strokeWidth={1.8} color={color.warn} />
            <Text style={styles.missingText}>
              อ่านไม่ได้ {parsed.missing_fields.length} ช่อง: {parsed.missing_fields.join(', ')}
            </Text>
          </Surface>
        ) : null}

        <Surface variant="flat" cornerRadius={radius.control} style={styles.raw}>
          <Text style={styles.rawLabel}>ข้อความที่อ่านได้จากสลิป</Text>
          <Text style={styles.rawText}>{rawText.trim()}</Text>
        </Surface>

        {save.error ? (
          <Surface variant="flat" cornerRadius={radius.control} style={styles.saveFailed}>
            <View style={styles.noticeRow}>
              <TriangleAlert size={17} strokeWidth={1.8} color={color.warn} />
              <Text style={styles.missingText}>
                {save.error instanceof Error ? save.error.message : 'บันทึกไม่สำเร็จ'}
              </Text>
            </View>
            {imageUri ? (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  keepForLater({
                    imageUri,
                    parsed: {
                      ...parsed,
                      amount: amount.trim(),
                      recipient_name: recipientName.trim() || null,
                    },
                    rawText,
                    lastError:
                      save.error instanceof Error ? save.error.message : 'บันทึกไม่สำเร็จ',
                  })
                }
                style={({ pressed }) => [styles.keep, pressed && styles.pressed]}>
                <CloudUpload size={16} strokeWidth={1.9} color={color.textSecondary} />
                <Text style={styles.keepLabel}>เก็บไว้ส่งทีหลัง</Text>
              </Pressable>
            ) : null}
          </Surface>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave || save.isPending, busy: save.isPending }}
          disabled={!canSave || save.isPending}
          onPress={onSave}
          style={({ pressed }) => [
            styles.saveButton,
            !canSave && styles.saveDisabled,
            pressed && styles.savePressed,
          ]}>
          {save.isPending ? (
            <ActivityIndicator color={color.white} />
          ) : (
            <>
              <Check size={19} strokeWidth={2.1} color={color.white} />
              <Text style={styles.saveLabel}>บันทึกรายการ</Text>
            </>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.discard, pressed && styles.pressed]}>
          <Text style={styles.discardLabel}>ทิ้งสลิปนี้</Text>
        </Pressable>
      </View>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Hairline() {
  return <View style={styles.hairline} />;
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
  close: {
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
  title: {
    ...type.headline,
    color: color.text,
  },
  centered: {
    flex: 1,
    paddingHorizontal: space.xl,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: space.xl,
    paddingBottom: space.lg,
    gap: space.md,
  },
  status: {
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.xl,
    paddingVertical: 28,
  },
  statusTitle: {
    ...type.rowTitle,
    color: color.text,
  },
  statusBody: {
    ...type.meta,
    textAlign: 'center',
    color: color.textMuted,
  },
  statusActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.sm,
  },
  retry: {
    height: 44,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: alpha.accentWash,
  },
  retryLabel: {
    ...type.label,
    color: color.accentInk,
  },
  keep: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: alpha.glassSoft,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: alpha.glassBorder,
  },
  keepLabel: {
    ...type.label,
    color: color.textSecondary,
  },
  saveFailed: {
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: 13,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  slip: {
    gap: 14,
    paddingHorizontal: space.xl,
    paddingTop: 18,
    paddingBottom: 20,
  },
  bankRow: {
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
    fontSize: 9.5,
    color: color.accentInk,
  },
  bankName: {
    ...type.label,
    flex: 1,
    color: color.textSecondary,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: alpha.accentWash,
  },
  typeChipLabel: {
    ...type.caption,
    color: color.accentInk,
  },
  amountField: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: 13,
    borderRadius: radius.control,
    backgroundColor: 'rgba(243,245,249,0.75)',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: alpha.hairlineSoft,
  },
  amountText: {
    flex: 1,
    gap: 3,
  },
  amountLabel: {
    ...type.caption,
    color: color.textSubtle,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currency: {
    ...type.amountLarge,
    color: color.text,
  },
  amountInput: {
    ...type.amountLarge,
    flex: 1,
    padding: 0,
    color: color.text,
  },
  feeText: {
    alignItems: 'flex-end',
    paddingBottom: 6,
  },
  feeLabel: {
    ...type.caption,
    fontSize: 10,
    color: color.textFaint,
  },
  fee: {
    ...type.label,
    color: color.textSecondary,
  },
  fields: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: 13,
  },
  fieldLabel: {
    ...type.label,
    width: 96,
    color: color.textSubtle,
  },
  fieldValue: {
    ...type.label,
    flex: 1,
    fontSize: 13.5,
    color: color.text,
  },
  recipientBlock: {
    paddingBottom: 11,
    backgroundColor: alpha.warnPanel,
  },
  recipientInput: {
    ...type.rowTitle,
    flex: 1,
    fontSize: 13.5,
    padding: 0,
    color: color.text,
  },
  recipientNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginLeft: 108,
    marginRight: space.lg,
  },
  recipientNoteText: {
    ...type.caption,
    flex: 1,
    color: color.warnText,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: alpha.hairlineSoft,
  },
  missing: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: 13,
  },
  missingText: {
    ...type.meta,
    flex: 1,
    color: color.warnText,
  },
  raw: {
    gap: 6,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
  },
  rawLabel: {
    ...type.label,
    color: color.textSecondary,
  },
  rawText: {
    ...type.caption,
    fontSize: 10.5,
    lineHeight: 16,
    color: color.textFaint,
  },
  footer: {
    paddingHorizontal: space.xl,
    paddingBottom: 26,
    paddingTop: space.sm,
    gap: 2,
  },
  saveButton: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
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
  discard: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discardLabel: {
    ...type.label,
    color: color.textMuted,
  },
});
