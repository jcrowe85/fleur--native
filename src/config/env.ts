import { Platform } from "react-native";

/**
 * Runtime configuration.
 *
 * EXPO_PUBLIC_* values are inlined by Metro at build time, so a missing one is
 * a build-configuration mistake, not a runtime condition. We surface it as a
 * clear message rather than either of the two bad alternatives: silently
 * falling back to localhost (a shipped app where nothing works and nothing says
 * why) or throwing during module evaluation (a white-screen crash the error
 * boundary never gets to see).
 */

/** Local dev fallback. Android emulators reach the host on 10.0.2.2. */
const DEFAULT_LOCAL =
  Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";

const missing: string[] = [];

/**
 * Read the first of `names` that is set.
 *
 * Supabase replaced the legacy `anon` / `service_role` JWTs with publishable
 * and secret keys. Accepting either lets the project migrate without a flag
 * day — which matters here because this value is inlined into the app bundle
 * at build time, so a released build is stuck with whatever key it shipped
 * with until the user updates.
 */
function readEnvAny(names: string[], devFallback?: string): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }

  if (__DEV__ && devFallback) {
    console.warn(`[env] none of ${names.join(", ")} set; falling back to ${devFallback}`);
    return devFallback;
  }

  missing.push(names[0]);
  return "";
}

function readEnv(name: string, devFallback?: string): string {
  const value = process.env[name]?.trim();
  if (value) return value;

  if (__DEV__ && devFallback) {
    console.warn(`[env] ${name} is not set; falling back to ${devFallback}`);
    return devFallback;
  }

  missing.push(name);
  return "";
}

export const API_BASE = readEnv("EXPO_PUBLIC_API_BASE", DEFAULT_LOCAL).replace(/\/+$/, "");
export const SUPABASE_URL = readEnv("EXPO_PUBLIC_SUPABASE_URL");
/**
 * The browser-safe key: `sb_publishable_…`, or the legacy `anon` JWT.
 *
 * Both are safe to ship in the bundle — they are what row level security is
 * designed to sit in front of. The name is kept as SUPABASE_ANON_KEY at the
 * call sites so the swap is a one-line env change.
 */
export const SUPABASE_ANON_KEY = readEnvAny([
  "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
]);

/** Optional — the shop degrades to the server-proxied catalog without these. */
export const SHOPIFY_STORE_DOMAIN =
  process.env.EXPO_PUBLIC_SHOPIFY_STORE_DOMAIN?.trim() ?? "";
export const SHOPIFY_STOREFRONT_TOKEN =
  process.env.EXPO_PUBLIC_SHOPIFY_STOREFRONT_TOKEN?.trim() ?? "";

/** Derived from the project ref when EXPO_PUBLIC_FUNCTIONS_URL is not given. */
export const FUNCTIONS_URL = (() => {
  const explicit = process.env.EXPO_PUBLIC_FUNCTIONS_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const match = SUPABASE_URL.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co/i);
  return match ? `https://${match[1]}.functions.supabase.co` : "";
})();

/** Names of required variables that were not provided at build time. */
export const missingEnvVars: readonly string[] = missing;

/**
 * Throws when the build is misconfigured. Call this from a component so the
 * root error boundary can render the message.
 */
export function assertEnvConfigured(): void {
  if (missing.length === 0) return;

  throw new Error(
    `Missing build configuration: ${missing.join(", ")}. ` +
      `Set these in the relevant eas.json build profile (or your local .env) and rebuild.`
  );
}
