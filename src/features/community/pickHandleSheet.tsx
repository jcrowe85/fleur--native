// src/features/community/pickHandleSheet.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { supabase } from "@/services/supabase";
import { useProfileStore } from "@/state/profileStore";
import {
  validateDisplayName,
  slugifyFromName,
  isHandleAvailable,
} from "@/services/profile";

type ResolvePayload = { display_name: string; avatarUrl?: string | null };
type ResolveFn = (v: ResolvePayload) => void;
type Ctx = { open: () => Promise<ResolvePayload> };

const Ctx = createContext<Ctx | null>(null);

export function usePickHandleSheet() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("PickHandleSheetProvider missing");
  return ctx;
}

export function PickHandleSheetProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const resolver = useRef<ResolveFn | null>(null);

  const open = useCallback(async () => {
    setError(null);
    setBusy(false);
    setName("");
    setVisible(true);
    return new Promise<ResolvePayload>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const closeWith = useCallback((payload: ResolvePayload) => {
    const r = resolver.current;
    resolver.current = null;
    setVisible(false);
    r?.(payload);
  }, []);

  const onSuggest = () => {
    // Lightweight suggestion; tune as you like.
    const suggestions = ["Fleur Friend", "Healthy Curls", "Shine Seeker", "Wave Whisperer"];
    const pick = suggestions[Math.floor(Math.random() * suggestions.length)];
    setName(pick);
    setError(null);
  };

  // Normalize a handle: lowercase, collapse whitespace to "_", and allow [a-z0-9._-]
  function normalizeHandle(input: string) {
    return (input ?? "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9._-]/g, "");
  }

  async function onContinue() {
    const msg = validateDisplayName(name);
    if (msg) return setError(msg);

    const base = normalizeHandle(slugifyFromName(name) || name);
    if (base.length < 3 || base.length > 24) {
      return setError("Pick 3–24 chars: letters, numbers, dot, underscore, or dash.");
    }

    setBusy(true);
    try {
      // Must be signed in
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) throw new Error("Not signed in");

      // Optional proactive hint (non-blocking)
      try {
        const ok = await isHandleAvailable(base);
        if (!ok) {
          // We won't block here; we'll append a suffix below on conflict.
        }
      } catch {
        // ignore availability network hiccups
      }

      // Try up to 3 attempts: base, base-xxx, base-yyy (unique index lower(handle) on server)
      let lastErr: any = null;
      for (let i = 0; i < 3; i++) {
        const candidate =
          i === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 5)}`; // short suffix
        const { error: upErr } = await supabase
          .from("profiles")
          .update({ handle: candidate, display_name: name })
          .eq("user_id", uid);

        if (!upErr) {
          // ✅ Update local store so we don't get re-prompted
          useProfileStore.setState((s: any) => ({
            profile: {
              ...(s.profile ?? { user_id: uid }),
              handle: candidate,
              display_name: name,
            },
          }));
          closeWith({ display_name: name });
          return;
        }

        lastErr = upErr;
        // 23505 = unique violation (someone grabbed it)
        const code = (upErr as any).code;
        const msg = String((upErr as any).message ?? "");
        const conflict = code === "23505" || /duplicate key|unique/i.test(msg);
        if (!conflict) throw upErr; // not a conflict → bubble up immediately
      }

      // If we got here, 3 conflicts in a row
      setError("That handle is taken. Try another.");
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const ctxVal = useMemo(() => ({ open }), [open]);
  const handlePreview = normalizeHandle(slugifyFromName(name) || name);

  return (
    <Ctx.Provider value={ctxVal}>
      {children}
      <Modal transparent visible={visible} animationType="fade" onRequestClose={() => setVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.centerWrap}
        >
          <View style={styles.cardShadow}>
            <BlurView intensity={90} tint="dark" style={styles.card}>
              <Text style={styles.title}>Pick a name</Text>
              <Text style={styles.subtitle}>This is how others will see you in Community.</Text>

              <TextInput
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  setError(null);
                }}
                autoCapitalize="words"
                autoCorrect
                placeholder="e.g. Kendra L."
                placeholderTextColor="rgba(255,255,255,0.5)"
                style={styles.input}
                maxLength={40}
              />

              {!!name.trim() && <Text style={styles.preview}>@{handlePreview}</Text>}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <View style={styles.row}>
                <Pressable onPress={onSuggest} style={[styles.btn, styles.ghostBtn]}>
                  <Text style={styles.ghostText}>Suggest</Text>
                </Pressable>
                <Pressable
                  onPress={onContinue}
                  disabled={busy || !name.trim()}
                  style={[styles.btn, styles.primaryBtn, (busy || !name.trim()) && { opacity: 0.6 }]}
                >
                  <Text style={styles.primaryText}>{busy ? "Checking…" : "Continue"}</Text>
                </Pressable>
              </View>
            </BlurView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "rgba(0,0,0,0.5)" },
  cardShadow: {
    width: "92%", maxWidth: 440, borderRadius: 16,
    shadowColor: "#000", shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 14,
  },
  card: { borderRadius: 16, padding: 18, overflow: "hidden" },
  title: { color: "#fff", fontWeight: "700", fontSize: 18, marginBottom: 4 },
  subtitle: { color: "rgba(255,255,255,0.8)", marginBottom: 14 },
  input: {
    borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", paddingHorizontal: 12, paddingVertical: 10,
    color: "#fff", backgroundColor: "rgba(255,255,255,0.08)",
  },
  preview: { color: "rgba(255,255,255,0.6)", marginTop: 8, marginBottom: 6 },
  error: { color: "#ffb4b4", marginTop: 6 },
  row: { flexDirection: "row", gap: 10, justifyContent: "flex-end", marginTop: 12 },
  btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  ghostBtn: { borderWidth: 1, borderColor: "rgba(255,255,255,0.35)", backgroundColor: "rgba(255,255,255,0.08)" },
  ghostText: { color: "#fff", fontWeight: "600" },
  primaryBtn: { backgroundColor: "#fff" },
  primaryText: { color: "#000", fontWeight: "700" },
});
