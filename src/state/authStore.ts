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

export const useAuthStore = create<AuthState>((set) => ({
  loading: true,
  session: null,
  user: null,
  error: null,

  bootstrap: async () => {
    try {
      // 1) Use existing session if present
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        set({ session: data.session, user: data.session.user, loading: false, error: null });
      } else {
        // 2) No session → create a guest once via Edge Function, then sign in
        const { data: creds, error } = await supabase.functions.invoke("create-guest", { body: {} });
        if (error) throw new Error(error.message ?? "create-guest failed");
        const { email, password } = creds as { email: string; password: string };

        const { data: signed, error: signErr } =
          await supabase.auth.signInWithPassword({ email, password });
        if (signErr || !signed.session || !signed.user) throw new Error(signErr?.message ?? "sign-in failed");

        set({ session: signed.session, user: signed.user, loading: false, error: null });
      }

      // 3) Keep store in sync with any token refresh or sign-out
      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session: session ?? null, user: session?.user ?? null });
      });
    } catch (e: any) {
      set({ error: e?.message ?? "Auth bootstrap error", loading: false });
      console.error("Auth bootstrap error:", e);
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },
}));
