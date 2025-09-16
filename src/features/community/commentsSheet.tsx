import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import {
  Modal,
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCommentsService } from "./comments.service";
import type { CommentItem } from "./types";

type ResolveFn = () => void;

// open accepts an optional onAdded callback so the opener (PostCard) can bump its count immediately
type Ctx = {
  open: (postId: string, opts?: { onAdded?: (n: number) => void }) => Promise<void>;
};

const Ctx = createContext<Ctx | null>(null);

export function useCommentsSheet() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("CommentsSheetProvider missing");
  return ctx;
}

function timeAgo(iso: string) {
  const s = Math.max(1, (Date.now() - new Date(iso).getTime()) / 1000);
  const m = s / 60, h = m / 60, d = h / 24;
  if (s < 60) return `${Math.floor(s)}s`;
  if (m < 60)  return `${Math.floor(m)}m`;
  if (h < 24)  return `${Math.floor(h)}h`;
  return `${Math.floor(d)}d`;
}

export function CommentsSheetProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [postId, setPostId] = useState<string | null>(null);

  const [text, setText] = useState("");
  const [items, setItems] = useState<CommentItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composerH, setComposerH] = useState(56);

  const resolver = useRef<ResolveFn | null>(null);
  const onAddedRef = useRef<((n: number) => void) | null>(null);

  const insets = useSafeAreaInsets();
  const { listPageForPost, create } = useCommentsService();

  const open = useCallback(
    async (id: string, opts?: { onAdded?: (n: number) => void }) => {
      onAddedRef.current = opts?.onAdded ?? null;
      setPostId(id);
      setItems([]);
      setPage(0);
      setHasMore(true);
      setText("");
      setError(null);
      setVisible(true);
      return new Promise<void>((resolve) => {
        resolver.current = resolve;
      });
    },
    []
  );

  const close = useCallback(() => {
    const r = resolver.current;
    resolver.current = null;
    onAddedRef.current = null;
    setVisible(false);
    r?.();
  }, []);

  async function load(reset = false) {
    if (!postId || loading) return;
    setLoading(true);
    try {
      const p = reset ? 0 : page;
      const { items: newItems, hasMore } = await listPageForPost(postId, p);
      setItems((prev) => (reset ? newItems : [...prev, ...newItems]));
      setHasMore(hasMore);
      setPage(p + 1);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load comments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (visible && postId) load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, postId]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await load(true);
    } finally {
      setRefreshing(false);
    }
  }

  async function onSend() {
    const body = text.trim();
    if (!body || !postId || sending) return;
    setSending(true);
    setText("");
    try {
      await create({ postId, body });
      onAddedRef.current?.(1); // bump count in the opener
      await onRefresh();       // refresh the list in the sheet
    } catch (e: any) {
      setError(e?.message ?? "Couldn't send. Check your connection.");
    } finally {
      setSending(false);
    }
  }

  const ctxVal = useMemo(() => ({ open }), [open]);

  return (
    <Ctx.Provider value={ctxVal}>
      {children}
      <Modal transparent visible={visible} animationType="fade" onRequestClose={close}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.centerWrap}
        >
          <View style={styles.sheetShadow}>
            <BlurView
              intensity={90}
              tint="dark"
              style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}
            >
              <View style={styles.grabber} />
              <View style={styles.headerRow}>
                <Text style={styles.title}>Comments</Text>
                <Pressable onPress={close} style={styles.closeBtn}>
                  <Text style={styles.closeText}>Close</Text>
                </Pressable>
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <FlatList
                data={items}
                keyExtractor={(c) => c.id}
                contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8 + composerH }}
                scrollIndicatorInsets={{ bottom: composerH }}
                keyboardShouldPersistTaps="handled"
                onEndReachedThreshold={0.3}
                onEndReached={() => hasMore && !loading && load(false)}
                // refreshing={refreshing}
                // onRefresh={onRefresh}
                renderItem={({ item }) => (
                  <View style={styles.commentRow}>
                    <View style={styles.commentAvatar} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.commentName}>
                          {item.author?.display_name ?? item.author?.handle ?? "Anonymous"}
                        </Text>
                        <Text style={styles.commentMeta}> · {timeAgo(item.created_at)}</Text>
                      </View>
                      <Text style={styles.commentBody}>{item.body}</Text>
                    </View>
                  </View>
                )}
                ListFooterComponent={
                  loading ? <Text style={styles.footer}>Loading…</Text> : null
                }
              />

              <View
                style={styles.composerRow}
                onLayout={(e) => setComposerH(e.nativeEvent.layout.height)}
              >
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder="Add a comment…"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  style={styles.input}
                  multiline
                />
                <Pressable
                  onPress={onSend}
                  style={[styles.sendBtn, sending && { opacity: 0.6 }]}
                  disabled={sending}
                >
                  {sending ? <ActivityIndicator /> : <Text style={styles.sendText}>Send</Text>}
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
  centerWrap: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  sheetShadow: {
    marginHorizontal: 8,
    marginBottom: 8,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 18,
  },
  sheet: { borderRadius: 18, overflow: "hidden", maxHeight: "78%" },
  grabber: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.35)",
    marginTop: 8,
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  title: { color: "#fff", fontWeight: "700", fontSize: 16 },
  closeBtn: {
    padding: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  closeText: { color: "#fff", fontWeight: "600" },
  error: { color: "rgba(255,180,180,1)", paddingHorizontal: 12, paddingBottom: 6 },
  commentRow: { flexDirection: "row", gap: 10, paddingHorizontal: 12, paddingVertical: 8 },
  commentAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.18)" },
  commentHeader: { flexDirection: "row", alignItems: "center", marginBottom: 2, flexWrap: "wrap" },
  commentName: { color: "#fff", fontWeight: "700" },
  commentMeta: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  commentBody: { color: "rgba(255,255,255,0.95)" },
  footer: { color: "rgba(255,255,255,0.8)", textAlign: "center", paddingVertical: 8 },
  composerRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-end",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  input: {
    flex: 1,
    color: "#fff",
    maxHeight: 120,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  sendBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: "#fff" },
  sendText: { color: "#000", fontWeight: "700" },
});
