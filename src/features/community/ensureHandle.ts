// src/features/community/ensureHandle.ts
import { supabase } from "@/services/supabase";
import { useProfileStore } from "@/state/profileStore";
import { ensureSession } from "./ensureSession"; // ✅ shared helper

// Single-flight to avoid multiple prompts at once
let inflight: Promise<void> | null = null;

export async function ensureHandleOrPrompt(
  openPickSheet: () => Promise<void> // your PickHandleSheet open()
) {
  if (inflight) return inflight;

  const run = async () => {
    // 0) Ensure we actually have a session (fixes RLS edge cases on iOS)
    const uid = await ensureSession();

    // 1) Local check
    const local = useProfileStore.getState().profile as
      | { user_id?: string; handle?: string; [k: string]: any }
      | null
      | undefined;

    if (local?.handle) return;

    // 2) Remote check (Supabase)
    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("user_id, handle, avatar_url, display_name")
      .eq("user_id", uid)
      .maybeSingle();

    // PGRST116 = no rows found for maybeSingle (not an error)
    if (profErr && profErr.code !== "PGRST116") {
      console.log("[ensureHandle] profile fetch error:", profErr);
    }

    if (prof?.handle) {
      // ✅ Persist to local store using Zustand's setState
      useProfileStore.setState((s: any) => ({
        profile: { ...(s.profile ?? { user_id: uid }), ...prof },
      }));
      return;
    }

    // 3) Prompt once — your sheet will create/reserve the handle server-side
    await openPickSheet();

    // 4) Re-fetch & persist so subsequent actions don’t re-prompt
    const { data: prof2 } = await supabase
      .from("profiles")
      .select("user_id, handle, avatar_url, display_name")
      .eq("user_id", uid)
      .single();

    if (prof2?.handle) {
      useProfileStore.setState((s: any) => ({
        profile: { ...(s.profile ?? { user_id: uid }), ...prof2 },
      }));
    }
  };

  inflight = run().finally(() => {
    inflight = null;
  });

  return inflight;
}
