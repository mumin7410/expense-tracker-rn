import { ChevronRight, LogOut, TriangleAlert, User } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GoogleMark } from '@/components/google-mark';
import { ScreenBackground } from '@/components/screen-background';
import { Surface } from '@/components/surface';
import { Toggle } from '@/components/toggle';
import { useCategories } from '@/features/categories/queries';
import { useNotificationPermission } from '@/features/notifications/use-notification-permission';
import {
  useLearnedRecipientCount,
  useUpdateSettings,
  useUserSettings,
} from '@/features/settings/queries';
import { useAuth } from '@/lib/auth';
import { isOcrConfigured, isSupabaseConfigured, ocrBaseUrl } from '@/lib/env';
import { useScreenshotWatcher } from '@/queue/use-screenshot-watcher';
import { alpha, color, radius, space, statusBarInset, type } from '@/theme/tokens';

const WIDGET_STYLE_LABEL: Record<string, string> = {
  default: 'มาตรฐาน',
};

export default function SettingsScreen() {
  const { session, signOut } = useAuth();
  const { data: settings } = useUserSettings();
  const updateSettings = useUpdateSettings();
  const { data: categories } = useCategories();
  const { data: learnedRecipients } = useLearnedRecipientCount();
  const screenshotWatcher = useScreenshotWatcher();
  const notificationPermission = useNotificationPermission();

  const user = session?.user;
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    'บัญชีของฉัน';

  // Both have to agree, or the toggle claims notifications are on while
  // Android silently drops them. `granted === null` is the pre-check tick.
  const notificationsOn =
    (settings?.notification_enabled ?? true) && notificationPermission.granted !== false;

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>ตั้งค่า</Text>

        <Surface cornerRadius={radius.card} style={styles.account}>
          <View style={styles.avatar}>
            <User size={22} strokeWidth={1.7} color={color.accentInk} />
          </View>
          <View style={styles.accountText}>
            <Text style={styles.accountName} numberOfLines={1}>
              {displayName}
            </Text>
            <View style={styles.accountProvider}>
              <GoogleMark size={12} />
              <Text style={styles.accountMeta} numberOfLines={1}>
                {user?.email ?? '—'}
              </Text>
            </View>
          </View>
        </Surface>

        <SectionLabel>การแจ้งเตือน</SectionLabel>
        <Surface variant="flat" cornerRadius={radius.control} style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>แจ้งเตือนเมื่อบันทึกสลิป</Text>
              <Text style={styles.rowHint}>
                {notificationPermission.granted === false
                  ? 'ต้องอนุญาตแจ้งเตือนก่อนจึงจะเปิดได้'
                  : 'บอกยอดและหมวดทันทีที่อ่านสลิปเสร็จ'}
              </Text>
            </View>
            <Toggle
              value={notificationsOn}
              disabled={!settings || updateSettings.isPending}
              accessibilityLabel="แจ้งเตือนเมื่อบันทึกสลิป"
              onValueChange={async (next) => {
                // Same shape as the screenshot watcher below: without the OS
                // permission there is nothing to turn on, so leave it off
                // rather than storing an intent the OS will not honour.
                if (next && !(await notificationPermission.request())) return;
                updateSettings.mutate({ notification_enabled: next });
              }}
            />
          </View>
        </Surface>

        <SectionLabel>จับภาพสลิป</SectionLabel>
        <Surface variant="flat" cornerRadius={radius.control} style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>จับภาพสลิปอัตโนมัติ</Text>
              <Text style={styles.rowHint}>
                {screenshotWatcher.permissions && !screenshotWatcher.permissions.images
                  ? 'ต้องอนุญาตเข้าถึงรูปภาพก่อนจึงจะเปิดได้'
                  : 'ตรวจจับภาพหน้าจอสลิปใหม่ให้เองในพื้นหลัง'}
              </Text>
            </View>
            <Toggle
              value={screenshotWatcher.enabled}
              disabled={screenshotWatcher.isLoading}
              accessibilityLabel="จับภาพสลิปอัตโนมัติ"
              onValueChange={screenshotWatcher.setEnabled}
            />
          </View>
        </Surface>

        <SectionLabel>หน้าโฮม</SectionLabel>
        <Surface variant="flat" cornerRadius={radius.control} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>หน้าตาวิดเจ็ต</Text>
            <Text style={styles.rowValue}>
              {WIDGET_STYLE_LABEL[settings?.widget_style ?? 'default'] ??
                settings?.widget_style}
            </Text>
            <ChevronRight size={16} strokeWidth={2} color={color.textGhost} />
          </View>
        </Surface>

        <SectionLabel>ข้อมูลของฉัน</SectionLabel>
        <Surface variant="flat" cornerRadius={radius.control} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>หมวดของฉัน</Text>
            <Text style={styles.rowValue}>
              {categories ? `${categories.length} หมวด` : '—'}
            </Text>
            <ChevronRight size={16} strokeWidth={2} color={color.textGhost} />
          </View>
          <Hairline />
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>ผู้รับที่จำไว้</Text>
              <Text style={styles.rowHint}>ผู้รับที่ระบบจัดหมวดให้เองแล้ว</Text>
            </View>
            <Text style={styles.rowValue}>
              {learnedRecipients === undefined ? '—' : `${learnedRecipients} ราย`}
            </Text>
            <ChevronRight size={16} strokeWidth={2} color={color.textGhost} />
          </View>
        </Surface>

        <SectionLabel>สำหรับนักพัฒนา</SectionLabel>
        <Surface variant="flat" cornerRadius={radius.control} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>ที่อยู่ OCR service</Text>
            <Text style={styles.rowValue} numberOfLines={1}>
              {isOcrConfigured ? ocrBaseUrl.replace(/^https?:\/\//, '') : 'ยังไม่ตั้งค่า'}
            </Text>
          </View>
          <Hairline />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Supabase</Text>
            <Text style={styles.rowValue}>
              {isSupabaseConfigured ? 'ตั้งค่าแล้ว' : 'ยังไม่ตั้งค่า'}
            </Text>
          </View>
        </Surface>

        {isSupabaseConfigured && isOcrConfigured ? null : (
          <Surface variant="flat" cornerRadius={radius.control} style={styles.notice}>
            <TriangleAlert size={17} strokeWidth={1.8} color={color.warn} />
            <Text style={styles.noticeText}>
              คัดลอก .env.example เป็น .env แล้วเติมค่าให้ครบ จากนั้นรีสตาร์ท Metro
            </Text>
          </Surface>
        )}

        {updateSettings.error ? (
          <Surface variant="flat" cornerRadius={radius.control} style={styles.notice}>
            <TriangleAlert size={17} strokeWidth={1.8} color={color.warn} />
            <Text style={styles.noticeText}>
              {updateSettings.error instanceof Error
                ? updateSettings.error.message
                : 'บันทึกการตั้งค่าไม่สำเร็จ'}
            </Text>
          </Surface>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ออกจากระบบ"
          onPress={signOut}
          style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}>
          <LogOut size={17} strokeWidth={1.9} color={color.danger} />
          <Text style={styles.signOutLabel}>ออกจากระบบ</Text>
        </Pressable>

        <Text style={styles.version}>สลิปสรุป 0.1.0 · ไม่เก็บรูปสลิปไว้ที่ไหนทั้งนั้น</Text>
      </ScrollView>
    </ScreenBackground>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function Hairline() {
  return <View style={styles.hairline} />;
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: statusBarInset,
    paddingHorizontal: space.xl,
    paddingBottom: 120,
  },
  title: {
    ...type.title,
    color: color.text,
  },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    marginTop: space.lg,
    paddingHorizontal: space.lg,
    paddingVertical: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: alpha.accentWash,
  },
  accountText: {
    flex: 1,
    gap: 3,
  },
  accountName: {
    ...type.headline,
    fontSize: 15.5,
    color: color.text,
  },
  accountProvider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accountMeta: {
    ...type.meta,
    flex: 1,
    color: color.textSubtle,
  },
  sectionLabel: {
    ...type.caption,
    marginTop: 22,
    marginBottom: space.sm,
    marginLeft: 6,
    color: color.textSubtle,
    letterSpacing: 0.4,
  },
  card: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 48,
    paddingHorizontal: space.lg,
    paddingVertical: 13,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    ...type.body,
    flex: 1,
    color: color.text,
  },
  rowHint: {
    ...type.caption,
    color: color.textSubtle,
  },
  rowValue: {
    ...type.label,
    color: color.textMuted,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    marginLeft: space.lg,
    backgroundColor: alpha.hairline,
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
  pressed: {
    opacity: 0.7,
  },
  signOut: {
    height: 52,
    marginTop: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: alpha.glassBorder,
  },
  signOutLabel: {
    ...type.headline,
    fontSize: 14.5,
    letterSpacing: 0,
    color: color.danger,
  },
  version: {
    ...type.caption,
    marginTop: 14,
    textAlign: 'center',
    color: color.textFaint,
  },
});
