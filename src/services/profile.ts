// src/services/profile.ts
import { supabase } from "@/services/supabase";
import type { Profile } from "@/types/profile";

export async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error(error?.message ?? "No authenticated user");
  return data.user.id;
}

export async function getMyProfile(): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, display_name, handle, avatar_url, is_guest")
    .maybeSingle();
  if (error && error.code !== "PGRST116") throw error;
  return (data as Profile) ?? null;
}

export async function isHandleAvailable(handle: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("handle", handle)
    .maybeSingle();
  if (error && error.code !== "PGRST116") throw error;
  return !data;
}

// ⭐ NEW: friendly → slug (lowercase, ascii, hyphens)
export function slugifyFromName(name: string): string {
  const ascii = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");              // strip diacritics
  const slug = ascii
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")                   // non-alnum → hyphen
    .replace(/^-+|-+$/g, "")                       // trim hyphens
    .replace(/--+/g, "-");                         // collapse
  return slug || "user";
}

// Optional: let users type almost anything, just cap length.
export function validateDisplayName(name: string): string | null {
  const trimmed = (name ?? "").trim();
  if (trimmed.length < 2 || trimmed.length > 40) return "Name must be 2–40 characters.";
  return null; // allow spaces, emojis, punctuation
}

export async function upsertMyProfile(input: { display_name: string; avatar_url?: string | null }) {
  const user_id = await getCurrentUserId();
  const handleBase = slugifyFromName(input.display_name);
  let handle = handleBase;

  // ensure uniqueness with a light suffix if needed
  if (!(await isHandleAvailable(handle))) {
    const n = Math.floor(1000 + Math.random() * 9000);
    handle = `${handleBase}-${n}`;
  }

  const { error } = await supabase
    .from("profiles")
    .upsert(
      { user_id, display_name: input.display_name, handle, avatar_url: input.avatar_url ?? null, is_guest: true },
      { onConflict: "user_id" }
    );
  if (error) throw error;
  return { handle };
}
