// src/services/secureStoreAdapter.ts
import * as SecureStore from "expo-secure-store";

/**
 * SecureStore-backed storage that transparently chunks large values.
 *
 * Android's SecureStore is backed by SharedPreferences + Keystore and refuses
 * values larger than 2048 bytes. A Supabase session (access JWT + refresh token
 * + user object) routinely exceeds that, so `setItemAsync` threw, the previous
 * adapter swallowed the error, and the session was never written to disk.
 *
 * The visible symptom was severe: on every cold start `getSession()` returned
 * null, `authStore.bootstrap()` treated the user as new and called
 * `create-guest` again — minting a fresh Supabase account and stranding all of
 * the previous account's cloud data.
 *
 * Values are stored as `<key>` when small, or split into `<key>.0`, `<key>.1`,
 * … with a `<key>` manifest recording the chunk count.
 */

/**
 * Conservative chunk size in *bytes*; SecureStore's Android limit is 2048.
 *
 * The limit is measured in UTF-8 bytes, not characters. Splitting on
 * `value.length` let a chunk of 1800 characters carrying non-ASCII content
 * (a display name, an email with an accent, a provider field) exceed 2048
 * bytes — expo-secure-store warned and Android could silently drop the write,
 * which is the same session-loss failure the chunking exists to prevent.
 */
const CHUNK_BYTES = 1500;
const MANIFEST_PREFIX = "__chunked__:";

/** UTF-8 byte length of a single code point. */
function codePointBytes(codePoint: number): number {
  if (codePoint < 0x80) return 1;
  if (codePoint < 0x800) return 2;
  if (codePoint < 0x10000) return 3;
  return 4;
}

/**
 * Split `value` so every part is at most `CHUNK_BYTES` UTF-8 bytes.
 *
 * Iterating code points (rather than UTF-16 units) keeps surrogate pairs
 * intact; a chunk boundary that bisected one would corrupt the rejoined value.
 */
function splitByBytes(value: string): string[] {
  const chunks: string[] = [];
  let current = "";
  let bytes = 0;

  for (const char of value) {
    const size = codePointBytes(char.codePointAt(0)!);
    if (bytes + size > CHUNK_BYTES && current !== "") {
      chunks.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }

  if (current !== "") chunks.push(current);
  return chunks;
}

/** UTF-8 byte length of a string. */
function byteLength(value: string): number {
  let bytes = 0;
  for (const char of value) bytes += codePointBytes(char.codePointAt(0)!);
  return bytes;
}

function chunkKey(key: string, index: number): string {
  return `${key}.${index}`;
}

async function clearChunks(key: string, count: number): Promise<void> {
  await Promise.all(
    Array.from({ length: count }, (_, i) =>
      SecureStore.deleteItemAsync(chunkKey(key, i)).catch(() => {})
    )
  );
}

function parseManifest(value: string | null): number | null {
  if (!value?.startsWith(MANIFEST_PREFIX)) return null;
  const count = Number(value.slice(MANIFEST_PREFIX.length));
  return Number.isInteger(count) && count > 0 ? count : null;
}

export const SecureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    try {
      const head = await SecureStore.getItemAsync(key);
      if (head === null) return null;

      const chunkCount = parseManifest(head);
      if (chunkCount === null) return head;

      const parts = await Promise.all(
        Array.from({ length: chunkCount }, (_, i) =>
          SecureStore.getItemAsync(chunkKey(key, i))
        )
      );

      // A missing chunk means a torn write; treat the whole value as absent
      // rather than handing back a truncated JWT.
      if (parts.some((part) => part === null)) {
        console.warn(`[secureStore] incomplete chunked value for "${key}"`);
        return null;
      }

      return parts.join("");
    } catch (error) {
      console.warn(`[secureStore] getItem("${key}") failed:`, error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      // Remove any chunks left over from a previous, larger value.
      const existing = await SecureStore.getItemAsync(key).catch(() => null);
      const previousChunks = parseManifest(existing);
      if (previousChunks !== null) await clearChunks(key, previousChunks);

      if (byteLength(value) <= CHUNK_BYTES) {
        await SecureStore.setItemAsync(key, value);
        return;
      }

      const chunks = splitByBytes(value);

      // Write the parts first, then the manifest, so a crash mid-write leaves
      // the key looking absent rather than pointing at partial data.
      for (let i = 0; i < chunks.length; i++) {
        await SecureStore.setItemAsync(chunkKey(key, i), chunks[i]);
      }
      await SecureStore.setItemAsync(key, `${MANIFEST_PREFIX}${chunks.length}`);
    } catch (error) {
      console.warn(`[secureStore] setItem("${key}") failed:`, error);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      const head = await SecureStore.getItemAsync(key).catch(() => null);
      const chunkCount = parseManifest(head);
      if (chunkCount !== null) await clearChunks(key, chunkCount);
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.warn(`[secureStore] removeItem("${key}") failed:`, error);
    }
  },
};

/**
 * Delete a key and any chunks belonging to it.
 *
 * SecureStore has no key-enumeration API, so callers must name the key. Used by
 * the dev reset, which otherwise cannot clear the Supabase session: sessions
 * moved from AsyncStorage into SecureStore when this adapter was introduced, so
 * an AsyncStorage-only wipe leaves the user signed in.
 */
export async function purgeSecureKey(key: string): Promise<void> {
  await SecureStoreAdapter.removeItem(key);
}

/** The storage key supabase-js uses for a given project URL. */
export function supabaseAuthStorageKey(supabaseUrl: string): string | null {
  const match = supabaseUrl.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co/i);
  return match ? `sb-${match[1]}-auth-token` : null;
}
