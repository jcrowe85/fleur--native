// server/src/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

/** Service-role client. Bypasses RLS — use for writes the server owns. */
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Anon-key client, used only to verify caller access tokens.
 *
 * Verifying through the service-role client coupled every authenticated request
 * to the service key being correct: a stale or missing key turned every request
 * — including plan builds — into a 401 that looked like an auth bug rather than
 * a configuration one. Token verification needs no elevated privileges.
 */
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabaseAuth = supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : supabase; // Fall back to the service client if no anon key is configured.

if (!supabaseAnonKey) {
  console.warn(
    '[supabase] SUPABASE_ANON_KEY is not set; falling back to the service-role ' +
      'client to verify access tokens.'
  );
}
