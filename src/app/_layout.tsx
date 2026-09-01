import {
  Anuphan_400Regular,
  Anuphan_500Medium,
  Anuphan_600SemiBold,
  Anuphan_700Bold,
  useFonts,
} from '@expo-google-fonts/anuphan';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/lib/auth';
import { color } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // The OCR service answers 503 when it is down and 400/415 when the image
      // is unusable. Only the first is worth another attempt, so retrying is
      // decided per request rather than globally.
      retry: false,
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Anuphan_400Regular,
    Anuphan_500Medium,
    Anuphan_600SemiBold,
    Anuphan_700Bold,
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          {/* Treat a font failure as ready: a missing webfont should cost the
              typeface, not the whole app. */}
          <RootNavigator fontsReady={fontsLoaded || Boolean(fontError)} />
        </SafeAreaProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { session, isRestoring } = useAuth();
  const ready = fontsReady && !isRestoring;

  useEffect(() => {
    // Held until the stored session is read back, so a signed-in user never
    // sees the sign-in screen flash past on launch.
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: color.bg },
        animation: 'fade',
      }}>
      {/* Outside both guards: the OAuth redirect arrives while signed out and
          finishes while signed in, so it must never be gated away mid-flight. */}
      <Stack.Screen name="auth/callback" />

      <Stack.Protected guard={Boolean(session)}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="review" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="transactions" options={{ animation: 'slide_from_right' }} />
      </Stack.Protected>

      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}
