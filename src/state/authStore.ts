// src/state/authStore.ts
import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/services/supabase";

type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  error: string | null;
  bootstrap: () => Promise<void>;
  signOut: () => Promise<void>;
};

let subscribed = false;

/** Build the functions base URL.
 * Set EXPO_PUBLIC_FUNCTIONS_URL in your .env for reliability on real devices:
 *   EXPO_PUBLIC_FUNCTIONS_URL=https://<ref>.functions.supabase.co
 * If not set, we'll derive it from EXPO_PUBLIC_SUPABASE_URL.
 */
function getFunctionsBase(): string {
  const explicit = process.env.EXPO_PUBLIC_FUNCTIONS_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
  const m = url.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co$/i);
  return m ? `https://${m[1]}.functions.supabase.co` : "";
}

/** Call the deployed create-guest function (no JWT required). */
async function createGuestViaFetch(): Promise<{ email: string; password: string }> {
  const base = getFunctionsBase();
  if (!base) throw new Error("Functions URL not configured");
  const res = await fetch(`${base}/create-guest`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`create-guest failed: ${res.status} ${txt}`);
  }
  return res.json();
}

export const useAuthStore = create<AuthState>((set) => ({
  loading: true,
  session: null,
  user: null,
  error: null,

  bootstrap: async () => {
    try {
      // 1) Use existing session if present
      const { data: sessRes } = await supabase.auth.getSession();
      if (sessRes?.session) {
        set({ session: sessRes.session, user: sessRes.session.user, loading: false, error: null });
      } else {
        // 2) No session → create a guest via hosted Edge Function, then sign in
        let creds: { email: string; password: string };

        // Prefer direct fetch to the functions domain (more reliable over tunnel on iOS)
        creds = await createGuestViaFetch().catch(async (e) => {
          // Fallback: try supabase.functions.invoke (same endpoint under the hood)
          console.warn("[auth] create-guest via fetch failed, falling back to functions.invoke:", e?.message);
          const { data, error } = await supabase.functions.invoke("create-guest", { body: {} });
          if (error) throw new Error(error.message ?? "create-guest (invoke) failed");
          return data as typeof creds;
        });

        const { email, password } = creds;

        const { data: signed, error: signErr } =
          await supabase.auth.signInWithPassword({ email, password });

        if (signErr || !signed?.session || !signed?.user) {
          throw new Error(signErr?.message ?? "sign-in failed");
        }

        set({ session: signed.session, user: signed.user, loading: false, error: null });
      }

      // 3) Keep store in sync with any token refresh or sign-out (register once)
      if (!subscribed) {
        supabase.auth.onAuthStateChange((_event, session) => {
          set({ session: session ?? null, user: session?.user ?? null });
        });
        subscribed = true;
      }
    } catch (e: any) {
      console.error("Auth bootstrap error:", e);
      set({ error: e?.message ?? "Auth bootstrap error", loading: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },
}));
