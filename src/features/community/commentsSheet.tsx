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
  Alert,
  ActionSheetIOS,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCommentsService } from "./comments.service";
import type { CommentItem } from "./types";
import { ensureSession } from "@/features/community/ensureSession";
import { Feather } from "@expo/vector-icons";

type ResolveFn = () => void;

// open accepts an optional onAdded callback so the opener (PostCard) can bump its count immediately
type Ctx = {
  open: (
    postId: string,
    opts?: {
      onAdded?: (n: number) => void; // existing
      onDelta?: (n: number) => void; // NEW: +1 on add, -1 on delete
    }
  ) => Promise<void>;
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
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [lastActionTime, setLastActionTime] = useState<number>(0);

  // authoring/editing state
  const [me, setMe] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const resolver = useRef<ResolveFn | null>(null);
  const onAddedRef = useRef<((n: number) => void) | null>(null);
  const onDeltaRef = useRef<((n: number) => void) | null>(null);

  const insets = useSafeAreaInsets();
  const { listPageForPost, create, update, remove } = useCommentsService();

  const open = useCallback(
    async (id: string, opts?: { onAdded?: (n: number) => void; onDelta?: (n: number) => void }) => {
      onDeltaRef.current = opts?.onDelta ?? null;
      onAddedRef.current = opts?.onAdded ?? null;
      setPostId(id);
      setItems([]);
      setPage(0);
      setHasMore(true);
      setText("");
      setError(null);
      setEditingId(null);
      setVisible(true);

      // get current user (for author controls)
      ensureSession().then((uid) => setMe(uid)).catch(() => setMe(null));

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
    setEditingId(null);
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

  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await load(true);
    } finally {
      setRefreshing(false);
    }
  }

  /** Create or Save edit */
  async function onSend() {
    const body = text.trim();
    if (!body || !postId || sending) return;
    setSending(true);

    try {
      if (editingId) {
        // save update
        const updated = await update(editingId, body);
        setItems((prev) => prev.map((c) => (c.id === editingId ? { ...c, body: updated.body } : c)));
        setEditingId(null);
        setText("");
      } else {
        // create
        await create({ postId, body });
        // Immediate count update for better UX
        onDeltaRef.current?.(1);
        setText("");
        // Refresh to show the new comment in the list
        await onRefresh();
      }
    } catch (e: any) {
      setError(e?.message ?? "Couldn't submit. Check your connection.");
    } finally {
      setSending(false);
    }
  }

  /** Enter edit mode */
  function onEdit(item: CommentItem) {
    setEditingId(item.id);
    setText(item.body);
  }

  /** Delete with confirm */
  async function onDelete(item: CommentItem) {
    const doDelete = async () => {
      try {
        await remove(item.id);
        setItems((prev) => prev.filter((c) => c.id !== item.id));

        // Immediate count update for better UX
        onDeltaRef.current?.(-1);

      } catch (e: any) {
        setError(e?.message ?? "Failed to delete");
      }
    };

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: "Delete comment?",
          options: ["Cancel", "Delete"],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
        },
        (i) => {
          if (i === 1) doDelete();
        }
      );
    } else {
      Alert.alert("Delete comment?", "This cannot be undone.", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]);
    }
  }

  /** Show actions: Edit / Delete (author only) */
  function showActions(item: CommentItem) {
    if (!me || item.user_id !== me) return;
    if (Platform.OS === "ios") {
      const options = ["Cancel", "Edit", "Delete"];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
          destructiveButtonIndex: 2,
          userInterfaceStyle: "dark",
        },
        (index) => {
          if (index === 1) onEdit(item);
          if (index === 2) onDelete(item);
        }
      );
    } else {
      // Android: simple inline alert menu as a convention-friendly fallback
      Alert.alert(
        "Comment actions",
        undefined,
        [
          { text: "Edit", onPress: () => onEdit(item) },
          { text: "Delete", style: "destructive", onPress: () => onDelete(item) },
          { text: "Cancel", style: "cancel" },
        ]
      );
    }
  }

  const ctxVal = useMemo(() => ({ open }), [open]);

  return (
    <Ctx.Provider value={ctxVal}>
      {children}
      <Modal 
        transparent 
        visible={visible} 
        animationType="slide" 
        onRequestClose={close}
        presentationStyle="overFullScreen"
      >
        <View style={styles.modalContainer}>
          {/* Backdrop */}
          <TouchableWithoutFeedback onPress={close}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>
          
          {/* Fixed Comments Sheet */}
          <View style={styles.sheet}>
            <BlurView
              intensity={90}
              tint="dark"
              style={styles.blurContainer}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.grabber} />
                <View style={styles.headerRow}>
                  <Text style={styles.title}>Comments</Text>
                  <Pressable onPress={close} style={styles.closeBtn}>
                    <Text style={styles.closeText}>Close</Text>
                  </Pressable>
                </View>
              </View>

              {/* Comments List */}
              <View style={styles.commentsContainer}>
                {error ? <Text style={styles.error}>{error}</Text> : null}
                
                <FlatList
                  data={items}
                  keyExtractor={(c) => c.id}
                  contentContainerStyle={styles.commentsList}
                  keyboardShouldPersistTaps="handled"
                  onEndReachedThreshold={0.3}
                  onEndReached={() => hasMore && !loading && load(false)}
                  renderItem={({ item }) => {
                    const isMine = me && item.user_id === me;
                    return (
                      <Pressable
                        onLongPress={() => isMine && showActions(item)}
                        delayLongPress={250}
                        style={styles.commentRow}
                      >
                        <View style={styles.commentAvatar} />
                        <View style={{ flex: 1 }}>
                          <View style={styles.commentHeader}>
                            <Text style={styles.commentName}>
                              {item.author?.display_name ?? item.author?.handle ?? "Anonymous"}
                            </Text>
                            <Text style={styles.commentMeta}> · {timeAgo(item.created_at)}</Text>
                            {isMine ? (
                              <Pressable
                                onPress={() => showActions(item)}
                                hitSlop={10}
                                style={styles.moreBtn}
                                accessibilityLabel="More actions"
                              >
                                <Feather name="more-vertical" size={16} color="#fff" />
                              </Pressable>
                            ) : null}
                          </View>
                          <Text style={styles.commentBody}>{item.body}</Text>
                        </View>
                      </Pressable>
                    );
                  }}
                  ListFooterComponent={
                    loading ? <Text style={styles.footer}>Loading…</Text> : null
                  }
                />
              </View>
            </BlurView>
          </View>

          {/* Separate Input Field with Keyboard Avoidance */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
            style={styles.inputKeyboardWrapper}
          >
            <View style={styles.inputContainer}>
              <View style={styles.composerRow}>
                {editingId ? (
                  <Pressable onPress={() => { setEditingId(null); setText(""); }} style={styles.cancelEdit}>
                    <Text style={styles.cancelEditText}>Cancel</Text>
                  </Pressable>
                ) : null}
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder={editingId ? "Edit your comment…" : "Add a comment…"}
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  style={styles.input}
                  multiline
                  returnKeyType="default"
                  blurOnSubmit={false}
                />
                <Pressable
                  onPress={onSend}
                  style={[styles.sendBtn, (sending || !text.trim()) && { opacity: 0.6 }]}
                  disabled={sending || !text.trim()}
                >
                  {sending ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.sendText}>{editingId ? "Save" : "Send"}</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  // Modal container
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Main sheet (fixed, no keyboard avoidance)
  sheet: {
    height: "75%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
    marginBottom: 0,
  },
  
  // Input keyboard wrapper (only this moves with keyboard)
  inputKeyboardWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  blurContainer: {
    flex: 1,
    flexDirection: "column",
  },
  
  // Header section
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  grabber: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.35)",
    marginTop: 8,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: { color: "#fff", fontWeight: "700", fontSize: 18 },
  closeBtn: {
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  closeText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  
  // Comments section
  commentsContainer: {
    flex: 1,
  },
  commentsList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: 20,
  },
  error: { color: "rgba(255,180,180,1)", paddingHorizontal: 16, paddingVertical: 8 },
  commentRow: { 
    flexDirection: "row", 
    gap: 12, 
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  commentAvatar: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: "rgba(255,255,255,0.18)" 
  },
  commentHeader: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 4, 
    flexWrap: "wrap" 
  },
  commentName: { color: "#fff", fontWeight: "700", fontSize: 14 },
  commentMeta: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  commentBody: { color: "rgba(255,255,255,0.95)", fontSize: 14, lineHeight: 20 },
  moreBtn: {
    marginLeft: 8,
    padding: 4,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  footer: { color: "rgba(255,255,255,0.8)", textAlign: "center", paddingVertical: 16 },
  
  // Input section
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backdropFilter: "blur(20px)",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  composerRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-end",
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  input: {
    flex: 1,
    color: "#fff",
    maxHeight: 100,
    minHeight: 40,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  sendBtn: { 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderRadius: 20, 
    backgroundColor: "#fff",
    minWidth: 60,
    alignItems: "center",
  },
  sendText: { color: "#000", fontWeight: "700", fontSize: 14 },
  cancelEdit: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  cancelEditText: { color: "#fff", fontWeight: "600", fontSize: 12 },
});
