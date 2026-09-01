import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ScreenBackground } from '@/components/screen-background';
import { useAuth } from '@/lib/auth';
import { color, space, type } from '@/theme/tokens';

/**
 * Where `expensetracker://auth/callback` lands.
 *
 * Android delivers the OAuth redirect to the app as a deep link, so this route
 * has to exist even though `openAuthSessionAsync` usually catches the same URL
 * first — without it the user gets expo-router's "Unmatched Route" screen at
 * the end of an otherwise successful sign-in. `completeSignIn` is idempotent,
 * so it does not matter which path arrives first.
 */
export default function AuthCallbackScreen() {
  const { code, error_description: errorDescription } = useLocalSearchParams<{
    code?: string;
    error_description?: string;
  }>();
  const { session, completeSignIn } = useAuth();

  useEffect(() => {
    if (code) completeSignIn(code);
  }, [code, completeSignIn]);

  if (session) return <Redirect href="/" />;

  // Nothing left to wait for: no code to exchange means the redirect came back
  // empty or refused, and the sign-in screen is where that gets reported.
  if (!code) return <Redirect href="/sign-in" />;

  return (
    <ScreenBackground>
      <View style={styles.content}>
        <ActivityIndicator color={color.accent} />
        <Text style={styles.label}>{errorDescription ?? 'กำลังเข้าสู่ระบบ'}</Text>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
  },
  label: {
    ...type.label,
    color: color.textMuted,
  },
});
