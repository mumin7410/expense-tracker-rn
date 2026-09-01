import type { Session } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { authRedirectUrl } from '@/lib/env';
import { supabase } from '@/lib/supabase';

// Closes the browser tab left over from a previous attempt.
WebBrowser.maybeCompleteAuthSession();

type AuthValue = {
  /** Exchanges an authorization code exactly once, whichever path delivers it. */
  completeSignIn: (code: string) => Promise<void>;
  session: Session | null;
  /** True until the stored session has been read back at launch. */
  isRestoring: boolean;
  isSigningIn: boolean;
  /** Last failure, in Thai, ready to render. Cleared on the next attempt. */
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

/**
 * A redirect can arrive twice: `openAuthSessionAsync` resolves with it, and
 * Android also delivers it to the app as a deep link, which lands on
 * `/auth/callback`. Whichever gets there first does the exchange; the other
 * finds the code already claimed and stops. An authorization code is
 * single-use, so a second exchange would fail and clear a session that had in
 * fact just been created.
 */
const claimedCodes = new Set<string>();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setIsRestoring(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const completeSignIn = useCallback(async (code: string) => {
    if (claimedCodes.has(code)) return;
    claimedCodes.add(code);

    setIsSigningIn(true);
    try {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) throw exchangeError;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'แลกรหัสยืนยันไม่สำเร็จ');
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    setIsSigningIn(true);
    try {
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: authRedirectUrl, skipBrowserRedirect: true },
      });
      if (oauthError) throw oauthError;
      if (!data?.url) throw new Error('Supabase ไม่ได้ส่งลิงก์เข้าสู่ระบบกลับมา');

      const result = await WebBrowser.openAuthSessionAsync(data.url, authRedirectUrl);

      // The user backed out. Not an error — say nothing.
      if (result.type !== 'success') return;

      const url = new URL(result.url);
      const description = url.searchParams.get('error_description');
      if (description) throw new Error(description);

      const code = url.searchParams.get('code');
      if (!code) {
        throw new Error(
          `กลับมาที่แอพแล้วแต่ไม่มีรหัสยืนยัน ตรวจว่า ${authRedirectUrl} อยู่ใน redirect allowlist ของ Supabase แล้วหรือยัง`
        );
      }

      await completeSignIn(code);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setIsSigningIn(false);
    }
  }, [completeSignIn]);

  const signOut = useCallback(async () => {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(signOutError.message);
  }, []);

  const value = useMemo(
    () => ({
      session,
      isRestoring,
      isSigningIn,
      error,
      completeSignIn,
      signInWithGoogle,
      signOut,
    }),
    [session, isRestoring, isSigningIn, error, completeSignIn, signInWithGoogle, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
