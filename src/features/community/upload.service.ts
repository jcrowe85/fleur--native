// src/features/community/upload.service.ts
import { supabase } from "@/services/supabase";
import { ensureSession } from "./ensureSession";

/**
 * (Optionally) downsize if expo-image-manipulator is installed, then
 * upload to Storage bucket "community" at <uid>/<timestamp>-<rand>.jpg
 * Returns a public URL string.
 */
export async function uploadImage(uri: string): Promise<string> {
  await ensureSession();

  // Try to downsize; if the lib isn't installed, keep the original uri.
  let finalUri = uri;
  try {
    const ImageManipulator = await import("expo-image-manipulator");
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1440 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );
    if (result?.uri) finalUri = result.uri;
  } catch {
    // no-op (lib not installed)
  }

  // Read the file into an ArrayBuffer (RN-friendly)
  const resp = await fetch(finalUri);
  if (!resp.ok) throw new Error(`Failed to read image: ${resp.status}`);
  const bytes = await resp.arrayBuffer();

  // Build a unique storage path under the user's folder
  const { data: u, error: uerr } = await supabase.auth.getUser();
  if (uerr || !u?.user) throw uerr ?? new Error("No auth user");
  const uid = u.user.id;
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const path = `${uid}/${filename}`;

  // Upload raw bytes
  const { error: upErr } = await supabase
    .storage
    .from("community")
    .upload(path, bytes, { contentType: "image/jpeg", upsert: false });

  if (upErr) throw upErr;

  // Return a public URL
  const { data: pub } = supabase.storage.from("community").getPublicUrl(path);
  return pub.publicUrl;
}

/**
 * Upload the first picked asset (if any). Returns null when no assets.
 */
export async function uploadFirstOrNull(assets: { uri: string }[]): Promise<string | null> {
  if (!assets?.length) return null;
  return uploadImage(assets[0].uri);
}

/**
 * Upload up to `limit` assets (default 3) and return an array of public URLs
 * in the same order as the provided assets. Skips null/undefined URIs.
 */
export async function uploadAll(
  assets: { uri?: string | null }[] = [],
  limit = 3
): Promise<string[]> {
  const slice = assets.filter(a => !!a?.uri).slice(0, Math.max(0, limit)) as { uri: string }[];
  const urls: string[] = [];
  for (const a of slice) {
    urls.push(await uploadImage(a.uri));
  }
  return urls;
}
