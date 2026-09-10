// src/state/authStore.ts
import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/services/supabase";
import { FUNCTIONS_URL, SUPABASE_ANON_KEY } from "@/config/env";

type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  error: string | null;
  isCloudSynced: boolean;
  bootstrap: () => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: { id: string; email: string; isCloudSynced: boolean }) => void;
};

/** Guest accounts use this domain; a real (cloud-synced) user never does. */
export const GUEST_EMAIL_DOMAIN = "@guest.local";

export function isGuestEmail(email?: string | null): boolean {
  return !!email && email.endsWith(GUEST_EMAIL_DOMAIN);
}

let authSubscription: { unsubscribe: () => void } | null = null;

/** Guards against two bootstrap() calls racing to create two guest accounts. */
let bootstrapInFlight: Promise<void> | null = null;

/** Create a guest account via the hosted Edge Function (no JWT required). */
async function createGuestViaFetch(): Promise<{ email: string; password: string }> {
  if (!FUNCTIONS_URL) throw new Error("Supabase Functions URL is not configured");

  const res = await fetch(`${FUNCTIONS_URL}/create-guest`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`create-guest failed: ${res.status} ${text}`);
  }

  return res.json();
}

async function runBootstrap(set: (partial: Partial<AuthState>) => void): Promise<void> {
  try {
    set({ loading: true, error: null });

    const { data: sessRes, error: sessErr } = await supabase.auth.getSession();

    if (sessErr) {
      // A transport failure here is NOT "no account". Creating a guest would
      // orphan the real account, so surface a retryable error instead.
      throw new Error(sessErr.message);
    }

    if (sessRes?.session) {
      set({
        session: sessRes.session,
        user: sessRes.session.user,
        isCloudSynced: !isGuestEmail(sessRes.session.user.email),
        loading: false,
        error: null,
      });
    } else {
      const creds = await createGuestViaFetch().catch(async (e) => {
        console.warn("[auth] create-guest fetch failed, retrying via invoke:", e?.message);
        const { data, error } = await supabase.functions.invoke("create-guest", { body: {} });
        if (error) throw new Error(error.message ?? "create-guest failed");
        return data as { email: string; password: string };
      });

      const { data: signed, error: signErr } = await supabase.auth.signInWithPassword({
        email: creds.email,
        password: creds.password,
      });

      if (signErr || !signed?.session || !signed?.user) {
        throw new Error(signErr?.message ?? "sign-in failed");
      }

      set({
        session: signed.session,
        user: signed.user,
        isCloudSynced: false,
        loading: false,
        error: null,
      });
    }

    subscribeToAuthChanges(set);
  } catch (e: any) {
    console.error("[auth] bootstrap error:", e);
    set({ error: e?.message ?? "Could not sign in", loading: false });
  }
}

/**
 * Track token refreshes and sign-outs.
 *
 * Registered once. Cloud restore deliberately runs only on an actual SIGNED_IN
 * event: the previous version also ran on INITIAL_SESSION, so every cold start
 * of a synced account pulled the whole cloud payload down and overwrote local
 * state that had not been uploaded yet.
 */
function subscribeToAuthChanges(set: (partial: Partial<AuthState>) => void): void {
  if (authSubscription) return;

  const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
    set({
      session: session ?? null,
      user: session?.user ?? null,
      isCloudSynced: !!session?.user && !isGuestEmail(session.user.email),
    });

    if (event !== "SIGNED_IN") return;
    if (!session?.user?.email || isGuestEmail(session.user.email)) return;

    try {
      const { cloudSyncService } = await import("@/services/cloudSyncService");
      const result = await cloudSyncService.syncFromCloud();
      if (!result.success && result.error) {
        console.warn("[auth] cloud restore skipped:", result.error);
      }
    } catch (error) {
      console.error("[auth] cloud restore failed:", error);
    }
  });

  authSubscription = data.subscription;
}

export const useAuthStore = create<AuthState>((set) => ({
  loading: true,
  session: null,
  user: null,
  error: null,
  isCloudSynced: false,

  bootstrap: async () => {
    // Two mounts racing here used to create two guest accounts, the second of
    // which won — silently discarding the first account's data.
    if (bootstrapInFlight) return bootstrapInFlight;

    bootstrapInFlight = runBootstrap(set).finally(() => {
      bootstrapInFlight = null;
    });

    return bootstrapInFlight;
  },

  signOut: async () => {
    // Push local state up before dropping the session, so nothing is lost.
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email && !isGuestEmail(user.email)) {
        const { cloudSyncService } = await import("@/services/cloudSyncService");
        await cloudSyncService.pushLocalData(user.id, user.email);
      }
    } catch (error) {
      console.warn("[auth] final sync before sign out failed:", error);
      // Sign out regardless — a stuck session is worse than a missed sync.
    }

    await supabase.auth.signOut();
    set({ session: null, user: null, isCloudSynced: false });

    const { usePlanStore } = await import("@/state/planStore");
    usePlanStore.getState().clearPlan();
    await usePlanStore.persist?.clearStorage?.();
  },

  setUser: (user) => {
    set((state) => ({
      // Preserve the real Supabase user object where we have one; this helper
      // only updates identity fields after an email link.
      user: state.user
        ? ({ ...state.user, id: user.id, email: user.email } as User)
        : ({
            id: user.id,
            email: user.email,
            created_at: new Date().toISOString(),
            app_metadata: {},
            user_metadata: {},
            aud: "authenticated",
            role: "authenticated",
          } as User),
      isCloudSynced: user.isCloudSynced,
    }));
  },
}));
