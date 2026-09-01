import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';

import { requireEnv, supabaseAnonKey, supabaseUrl } from '@/lib/env';

/**
 * SecureStore warns above 2048 bytes and is not guaranteed to store more, but a
 * Supabase session — access token, refresh token and the whole user object —
 * runs well past that. Unchunked, sign-in appears to work and the session is
 * silently gone on next launch.
 *
 * So values are split across `<key>.0`, `<key>.1`, … and `<key>` itself holds
 * the chunk count.
 */
const CHUNK_SIZE = 1800;

const chunkedSecureStore = {
  async getItem(key: string): Promise<string | null> {
    const count = await SecureStore.getItemAsync(key);
    if (!count) return null;

    const parts = await Promise.all(
      Array.from({ length: Number(count) }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`))
    );
    // A missing chunk means a half-written session; treat it as no session at
    // all rather than handing Supabase a truncated JSON blob.
    if (parts.some((part) => part === null)) return null;
    return parts.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }

    await Promise.all(
      chunks.map((chunk, i) => SecureStore.setItemAsync(`${key}.${i}`, chunk))
    );
    await SecureStore.setItemAsync(key, String(chunks.length));
  },

  async removeItem(key: string): Promise<void> {
    const count = await SecureStore.getItemAsync(key);
    if (count) {
      await Promise.all(
        Array.from({ length: Number(count) }, (_, i) =>
          SecureStore.deleteItemAsync(`${key}.${i}`)
        )
      );
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(
  requireEnv('EXPO_PUBLIC_SUPABASE_URL', supabaseUrl),
  requireEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', supabaseAnonKey),
  {
    auth: {
      storage: chunkedSecureStore,
      autoRefreshToken: true,
      persistSession: true,
      // There is no URL bar to read a session out of; the deep link handler
      // exchanges the code itself.
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  }
);

// Refreshing on a timer while the app is backgrounded burns nothing useful and
// can fire against a dead network. Follow the foreground instead.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
