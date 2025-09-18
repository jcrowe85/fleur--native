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
  StyleSheet as RNStyleSheet,
} from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons"; // ✨ for the close (x) icon
import { supabase } from "@/services/supabase";
import { useProfileStore } from "@/state/profileStore";
import {
  validateDisplayName,
  slugifyFromName,
  isHandleAvailable,
} from "@/services/profile";

type ResolvePayload = { display_name: string; avatarUrl?: string | null };
type ResolveFn = (v: ResolvePayload) => void;
type RejectFn = (reason?: any) => void; // ✨ add a reject type
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

  // ✨ keep BOTH resolve and reject so we can cancel cleanly
  const resolver = useRef<ResolveFn | null>(null);
  const rejecter = useRef<RejectFn | null>(null);

  const open = useCallback(async () => {
    setError(null);
    setBusy(false);
    setName("");
    setVisible(true);
    return new Promise<ResolvePayload>((resolve, reject) => {
      resolver.current = resolve;
      rejecter.current = reject; // ✨ capture reject
    });
  }, []);

  const cleanup = () => {
    resolver.current = null;
    rejecter.current = null;
  };

  const closeWith = useCallback((payload: ResolvePayload) => {
    const res = resolver.current;
    setVisible(false);
    cleanup();
    res?.(payload);
  }, []);

  // ✨ unified cancel path (backdrop tap, X button, Android back)
  const cancel = useCallback(() => {
    const rej = rejecter.current;
    setVisible(false);
    cleanup();
    rej?.(new Error("pick-handle:cancelled"));
  }, []);

  const onSuggest = () => {
    const suggestions = ["Fleur Friend", "Healthy Curls", "Shine Seeker", "Wave Whisperer"];
    const pick = suggestions[Math.floor(Math.random() * suggestions.length)];
    setName(pick);
    setError(null);
  };

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
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) throw new Error("Not signed in");

      try {
        await isHandleAvailable(base).catch(() => {});
      } catch {}

      for (let i = 0; i < 3; i++) {
        const candidate = i === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 5)}`;
        const { error: upErr } = await supabase
          .from("profiles")
          .update({ handle: candidate, display_name: name })
          .eq("user_id", uid);

        if (!upErr) {
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

        const code = (upErr as any).code;
        const text = String((upErr as any).message ?? "");
        const conflict = code === "23505" || /duplicate key|unique/i.test(text);
        if (!conflict) throw upErr;
      }

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
      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={cancel} // ✨ Android back
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.centerWrap}
        >
          {/* ✨ BACKDROP that closes on tap */}
          <Pressable style={RNStyleSheet.absoluteFill} onPress={cancel} />

          {/* Card on top of the backdrop */}
          <View style={styles.cardShadow}>
            <BlurView intensity={90} tint="dark" style={styles.card}>
              {/* ✨ Close (X) */}
              <Pressable
                onPress={cancel}
                accessibilityRole="button"
                accessibilityLabel="Close"
                android_ripple={{ color: "rgba(255,255,255,0.15)", borderless: true }}
                hitSlop={8}
                style={styles.closeBtn}
              >
                <Feather name="x" size={20} color="#fff" />
              </Pressable>

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
  closeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 35,
    height: 35,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(79, 79, 79, 0.51)", // slightly darker = clearer
    zIndex: 2,                            // ensure it’s above text/inputs
    elevation: 6,                         // Android
    shadowColor: "#000",                  // iOS shadow polish
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  title: { color: "#fff", fontWeight: "700", fontSize: 18, marginBottom: 4, paddingRight: 56 },
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
