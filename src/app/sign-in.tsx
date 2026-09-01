import { Check, Receipt, TriangleAlert } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { GoogleMark } from '@/components/google-mark';
import { ScreenBackground } from '@/components/screen-background';
import { Surface } from '@/components/surface';
import { useAuth } from '@/lib/auth';
import { alpha, color, radius, space, statusBarInset, type } from '@/theme/tokens';

const PROMISES = [
  'อ่านสลิปได้ 4 ธนาคาร — ttb, K PLUS, SCB, UOB',
  'จำผู้รับที่เคยจัดหมวดไว้ ครั้งหน้าจัดให้เอง',
  'ไม่เก็บรูปสลิป เก็บเฉพาะข้อมูลที่อ่านได้',
];

export default function SignInScreen() {
  const { signInWithGoogle, isSigningIn, error } = useAuth();

  return (
    <ScreenBackground>
      <View style={styles.content}>
        <Surface cornerRadius={radius.card} style={styles.mark}>
          <Receipt size={38} strokeWidth={1.6} color={color.accent} />
        </Surface>

        <Text style={styles.wordmark}>สลิปสรุป</Text>
        <Text style={styles.headline}>แคปสลิปไว้{'\n'}ที่เหลือแอพจดให้</Text>
        <Text style={styles.body}>
          อ่านยอด วันที่ และผู้รับจากสลิปโอนเงินให้อัตโนมัติ แล้วจัดหมวดให้เอง ไม่ต้องพิมพ์
        </Text>

        <Surface variant="glass" cornerRadius={radius.control} style={styles.promises}>
          {PROMISES.map((promise) => (
            <View key={promise} style={styles.promiseRow}>
              <Check size={19} strokeWidth={1.8} color={color.accent} />
              <Text style={styles.promiseText}>{promise}</Text>
            </View>
          ))}
        </Surface>

        <View style={styles.spacer} />

        {error ? (
          <Surface variant="flat" cornerRadius={radius.control} style={styles.error}>
            <TriangleAlert size={17} strokeWidth={1.8} color={color.warn} />
            <Text style={styles.errorText}>{error}</Text>
          </Surface>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="เข้าสู่ระบบด้วย Google"
          accessibilityState={{ busy: isSigningIn, disabled: isSigningIn }}
          disabled={isSigningIn}
          onPress={signInWithGoogle}
          style={({ pressed }) => [styles.google, pressed && styles.googlePressed]}>
          {isSigningIn ? (
            <ActivityIndicator color={color.textMuted} />
          ) : (
            <>
              <GoogleMark />
              <Text style={styles.googleLabel}>เข้าสู่ระบบด้วย Google</Text>
            </>
          )}
        </Pressable>

        <View style={styles.facebook}>
          <Text style={styles.facebookLabel}>Facebook · เร็ว ๆ นี้</Text>
        </View>

        <Text style={styles.fineprint}>
          การเข้าสู่ระบบถือว่ายอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัว
        </Text>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: statusBarInset + 4,
    paddingHorizontal: 24,
    paddingBottom: 34,
  },
  mark: {
    width: 82,
    height: 82,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    ...type.label,
    marginTop: 22,
    color: color.accentInk,
    letterSpacing: 3,
  },
  headline: {
    fontFamily: type.headline.fontFamily,
    fontSize: 33,
    lineHeight: 46,
    letterSpacing: -0.9,
    includeFontPadding: true,
    marginTop: 10,
    color: color.text,
  },
  body: {
    fontFamily: type.body.fontFamily,
    fontSize: 15,
    lineHeight: 25,
    includeFontPadding: true,
    marginTop: space.lg,
    color: color.textMuted,
  },
  promises: {
    marginTop: 26,
    paddingHorizontal: space.xs,
    paddingVertical: 6,
  },
  promiseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  promiseText: {
    ...type.label,
    flex: 1,
    fontSize: 13.5,
    color: color.textSecondary,
  },
  spacer: {
    flex: 1,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    marginBottom: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: 13,
  },
  errorText: {
    ...type.meta,
    flex: 1,
    color: color.warnText,
  },
  google: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: alpha.glassBorderStrong,
    boxShadow: '0px 16px 34px -16px rgba(36,41,51,0.35)',
  },
  googlePressed: {
    backgroundColor: 'rgba(240,242,248,0.95)',
  },
  googleLabel: {
    ...type.headline,
    fontSize: 15.5,
    letterSpacing: -0.1,
    color: color.text,
  },
  facebook: {
    height: 52,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.36)',
  },
  facebookLabel: {
    ...type.label,
    fontSize: 14.5,
    color: color.textSubtle,
  },
  fineprint: {
    ...type.caption,
    marginTop: space.lg,
    paddingHorizontal: 10,
    textAlign: 'center',
    color: color.textSubtle,
  },
});
