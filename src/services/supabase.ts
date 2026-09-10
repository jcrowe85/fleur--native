// Polyfills first
import "react-native-url-polyfill/auto";
import "react-native-get-random-values";

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/config/env";
import { SecureStoreAdapter } from "./secureStoreAdapter";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Chunking adapter — see secureStoreAdapter for why this matters on Android.
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
    // NOTE: `onAuthStateChange` is not a valid client option — passing it here
    // did nothing, so the sign-out cleanup it contained never ran. Subscribe via
    // supabase.auth.onAuthStateChange() instead (see authStore.bootstrap).
  },
  global: {
    headers: { "X-Client-Info": "fleur-native-app" },
  },
});
