// src/features/community/ensureSession.ts
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/state/authStore";

/** Ensures there is a valid Supabase session; returns the user id (uid). */
export async function ensureSession(): Promise<string> {
  // 1) Already signed in?
  const { data } = await supabase.auth.getSession();
  const uid = data?.session?.user?.id;
  if (uid) return uid;

  // 2) Try to bootstrap a guest session
  const bootstrap = useAuthStore.getState().bootstrap;
  await bootstrap();

  // 3) Check again
  const { data: after } = await supabase.auth.getSession();
  const uid2 = after?.session?.user?.id;
  if (!uid2) throw new Error("Not signed in");
  return uid2;
}
