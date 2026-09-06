/**
 * Build-time configuration.
 *
 * `EXPO_PUBLIC_*` values are inlined by Metro, so they must be read as static
 * property accesses — `process.env[name]` is not substituted and always comes
 * back undefined in a release bundle.
 */

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const ocrBaseUrl = process.env.EXPO_PUBLIC_OCR_BASE_URL ?? '';
/**
 * Sent as `X-API-Key`. Inlined into the bundle like everything else here, so
 * anyone who unpacks the APK can read it — it keeps scanners off a public OCR
 * host, and is not a claim about who the caller is. Empty is fine against a
 * local service that has no key set.
 */
export const ocrApiKey = process.env.EXPO_PUBLIC_OCR_API_KEY ?? '';

/** The deep link Supabase redirects back to. Must be in the project's allowlist. */
export const authRedirectUrl = 'expensetracker://auth/callback';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const isOcrConfigured = Boolean(ocrBaseUrl);

/**
 * Fails loudly at the point of use rather than at import: a missing key should
 * name itself on the screen that needed it, not crash the app on launch.
 */
export function requireEnv(name: string, value: string): string {
  if (!value) {
    throw new Error(`${name} is not set. Copy .env.example to .env and fill it in.`);
  }
  return value;
}
