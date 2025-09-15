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
  import {
    validateDisplayName,
    slugifyFromName,
    isHandleAvailable,
  } from "@/services/profile";
  
  type ResolveFn = (v: { display_name: string; avatarUrl?: string | null }) => void;
  type Ctx = { open: () => Promise<{ display_name: string; avatarUrl?: string | null }> };
  
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
      return new Promise<{ display_name: string; avatarUrl?: string | null }>((resolve) => {
        resolver.current = resolve;
      });
    }, []);
  
    const closeWith = useCallback((payload: { display_name: string; avatarUrl?: string | null }) => {
      const r = resolver.current;
      resolver.current = null;
      setVisible(false);
      r?.(payload);
    }, []);
  
    const onSuggest = () => {
      // Lightweight suggestion; you can make this fancier if you like.
      const suggestions = ["Fleur Friend", "Healthy Curls", "Shine Seeker", "Wave Whisperer"];
      const pick = suggestions[Math.floor(Math.random() * suggestions.length)];
      setName(pick);
      setError(null);
    };
  
    const onContinue = async () => {
      const msg = validateDisplayName(name);
      if (msg) return setError(msg);
  
      // Optional proactive availability hint (we derive handle from name)
      try {
        setBusy(true);
        const handle = slugifyFromName(name);
        const ok = await isHandleAvailable(handle);
        // If not available, we still continue; server upsert will append a suffix.
        if (!ok) {
          // You could show a hint here, but we’ll let the server add a suffix.
        }
        closeWith({ display_name: name });
      } catch (e: any) {
        setError(e?.message ?? "Something went wrong.");
      } finally {
        setBusy(false);
      }
    };
  
    const ctxVal = useMemo(() => ({ open }), [open]);
    const handlePreview = slugifyFromName(name);
  
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
  
                <Text style={styles.preview}>@{handlePreview}</Text>
  
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
  