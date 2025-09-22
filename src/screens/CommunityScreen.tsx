// src/screens/CommunityScreen.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ImageBackground,
  Modal,
  Image,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { FlatList as HFlatList } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
// import { LinearGradient } from "expo-linear-gradient"; // (optional, currently unused)
import * as ImagePicker from "expo-image-picker";

import { useFeed } from "@/features/community/useFeed";
import { PostCard } from "@/features/community/PostCard";
import { usePostsService } from "@/features/community/posts.service";

// Uploader
import { uploadAll } from "@/features/community/upload.service";

// NEW: identity + handle prompt wiring
import { useProfileStore } from "@/state/profileStore";
import { usePickHandleSheet } from "@/features/community/pickHandleSheet";
import { ensureHandleOrPrompt } from "@/features/community/ensureHandle";

// Rewards pill (compact, top-right)
import RewardsPill from "@/components/UI/RewardsPill";

// ✅ Shared bottom spacing helpers
import { ScreenFlatList } from "@/components/UI/bottom-space";

/** UI labels shown in header row */
const CATEGORY_LABELS = ["Hair Journeys", "Tips & Tricks", "Before & After", "Questions"] as const;
type CategoryLabel = (typeof CATEGORY_LABELS)[number];

/** DB codes expected by posts.category CHECK constraint */
type CategoryCode = "hair_journeys" | "tips_tricks" | "before_after" | "questions";
const CATEGORY_CODE: Record<CategoryLabel, CategoryCode> = {
  "Hair Journeys": "hair_journeys",
  "Tips & Tricks": "tips_tricks",
  "Before & After": "before_after",
  "Questions": "questions",
};

/** De-dupe helper to avoid duplicate FlatList keys when refresh + realtime merge */
function uniqById<T extends { id?: string | null }>(arr: T[]) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const x of arr) {
    const k = x.id ?? "";
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

function getInitials(full?: string) {
  const n = (full ?? "").trim();
  if (!n) return "YY";
  const parts = n.split(/\s+/);
  const a = (parts[0]?.[0] ?? "Y").toUpperCase();
  const b = (parts[1]?.[0] ?? parts[0]?.[1] ?? "Y").toUpperCase();
  return a + b;
}

export default function CommunityScreen() {
  const { items, hasMore, loadMore, refresh, loading, error } = useFeed();
  const { create } = usePostsService();

  const { profile } = useProfileStore();
  const { open: openPickHandle } = usePickHandleSheet();

  // Header category (just filters UI)
  const [activeCat, setActiveCat] = useState<CategoryLabel>("Hair Journeys");

  // Faux composer modal state
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerCat, setComposerCat] = useState<CategoryLabel | null>(null); // no default
  const [composerText, setComposerText] = useState("");
  const [catError, setCatError] = useState(false); // highlight category section on submit if missing
  const [assets, setAssets] = useState<{ uri: string; width?: number; height?: number }[]>([]);
  const maxChars = 500;
  const maxAssets = 3;

  const insets = useSafeAreaInsets();

  async function openPicker() {
    if (assets.length >= maxAssets) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      selectionLimit: Math.max(1, maxAssets - assets.length),
      quality: 0.8,
    });
    if (!res.canceled) {
      const picked = res.assets.map((a) => ({ uri: a.uri, width: a.width, height: a.height }));
      setAssets((prev) => [...prev, ...picked].slice(0, maxAssets));
    }
  }

  function resetComposer() {
    setComposerOpen(false);
    setComposerText("");
    setAssets([]);
    setComposerCat(null);
    setCatError(false);
  }

  // 🔒 Guard: ensure session + handle before opening the composer
  async function openComposerGuarded() {
    try {
      await ensureHandleOrPrompt(openPickHandle);
      setComposerOpen(true); // only if user has/sets a handle
    } catch (e) {
      if ((e as Error)?.message === "pick-handle:cancelled") return;
      console.error("[ensureHandle] failed:", e);
    }
  }

  async function submitFromModal() {
    const body = composerText.trim();
    if (!body) return;

    if (!composerCat) {
      setCatError(true);
      return;
    }

    try {
      const mediaUrls = await uploadAll(assets, 3);

      await create({
        body,
        category: CATEGORY_CODE[composerCat],
        mediaUrls,
        mediaUrl: mediaUrls[0] ?? null,
      });

      resetComposer();
      await refresh();
    } catch (e: any) {
      console.error("[create-post] failed:", e?.message ?? e);
    }
  }

  // Feed data: de-dupe, then filter by active header category (if rows have `category`)
  const deduped = useMemo(() => uniqById(items), [items]);
  const activeCode = CATEGORY_CODE[activeCat];
  const filtered = useMemo(
    () => deduped.filter((p: any) => (p.category ? p.category === activeCode : true)),
    [deduped, activeCode]
  );

  // Empty ListHeader since all content is now in fixed header
  const ListHeader = (
    <View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#120d0a" }}>
      <ImageBackground
        source={require("../../assets/dashboard.png")}
        resizeMode="cover"
        style={StyleSheet.absoluteFillObject as any}
      />
      {/* If you want the gradient overlay, uncomment:
      <LinearGradient
        colors={["rgba(0,0,0,0.10)", "rgba(0,0,0,0.35)", "rgba(0,0,0,0.70)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject as any}
      /> */}

      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
          <View style={{ width: 38 }} />
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "600" }}>Community</Text>
            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 4 }}>Share your hair journey</Text>
          </View>
          <View style={{ padding: 8, borderRadius: 20 }}>
            <RewardsPill compact />
          </View>
        </View>

        {/* Categories */}
        <HFlatList
          horizontal
          data={CATEGORY_LABELS}
          keyExtractor={(c) => c}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catList}
          style={styles.catListView}
          renderItem={({ item }) => {
            const active = item === activeCat;
            return (
              <Pressable onPress={() => setActiveCat(item)} style={styles.catBtn}>
                <Text style={[styles.catText, active && styles.catTextActive]} numberOfLines={1}>
                  {item}
                </Text>
                <View style={[styles.catUnderline, active && styles.catUnderlineActive]} />
              </Pressable>
            );
          }}
          ListFooterComponent={<View style={{ width: 16 }} />}
        />

        {/* Faux composer */}
        <View style={styles.fakeComposerShadow}>
          <Pressable onPress={openComposerGuarded} style={styles.fakeComposer}>
            <View style={styles.fakeLeft}>
              <View style={styles.fakeAvatar}>
                <Feather name="user" size={14} color="rgba(255,255,255,0.9)" />
              </View>
              <Text style={styles.fakePlaceholder}>Share your hair journey…</Text>
            </View>
            <View style={styles.fakeActions}>
              <View style={styles.fakeIconBtn}>
                <Feather name="camera" size={16} color="rgba(255,255,255,0.95)" />
              </View>
              <View style={styles.fakePostPill}>
                <Text style={styles.fakePostPillText}>Post</Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* Scrollable Feed */}
        <ScreenFlatList
          style={styles.feedList}
          data={filtered}
          keyExtractor={(p) => String(p.id)}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.feedContent}
          bottomExtra={16}
          renderItem={({ item }) => <PostCard post={item} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => hasMore && loadMore()}
          ListFooterComponent={loading ? <Text style={styles.footer}>Loading…</Text> : null}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </SafeAreaView>

      {/* Create Post Modal */}
      <Modal
        visible={composerOpen}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
        onRequestClose={resetComposer}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalBackdrop}>
            {/* KeyboardAvoidingView lifts the sheet above the iOS keyboard */}
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
              style={styles.kav}
            >
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={[styles.modalSheet, { paddingBottom: 16 + insets.bottom }]}>
                  {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create New Post</Text>
                <Pressable onPress={resetComposer} hitSlop={8} style={styles.closeBtn}>
                  <Feather name="x" size={18} color="#6b5f5a" />
                </Pressable>
              </View>

              {/* User row (dynamic profile instead of hard-coded) */}
              <View style={styles.modalUserRow}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {getInitials(profile?.display_name || profile?.handle || "You")}
                  </Text>
                </View>
                <View>
                  <Text style={styles.userName}>
                    {profile?.display_name || profile?.handle || "Set your name"}
                  </Text>
                  <Text style={styles.userSub}>
                    {profile?.handle ? `@${profile.handle}` : "Posting to Community"}
                  </Text>
                </View>
              </View>

              {/* Category chips (no default) */}
              <Text style={[styles.sectionLabel, catError && styles.sectionLabelError]}>Category</Text>
              {catError ? <Text style={styles.errorHint}>Please choose a category.</Text> : null}
              <HFlatList
                horizontal
                data={CATEGORY_LABELS}
                keyExtractor={(c) => `modal-${c}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 6, paddingHorizontal: 2 }}
                renderItem={({ item }) => {
                  const active = item === composerCat;
                  return (
                    <Pressable
                      onPress={() => {
                        setComposerCat(item);
                        if (catError) setCatError(false);
                      }}
                      style={[styles.catChip, active && styles.catChipActive]}
                    >
                      <Text style={[styles.catChipText, active && styles.catChipTextActive]}>{item}</Text>
                    </Pressable>
                  );
                }}
                ListFooterComponent={<View style={{ width: 8 }} />}
              />

              {/* Text area */}
              <TextInput
                value={composerText}
                onChangeText={(t) => setComposerText(t.slice(0, maxChars))}
                placeholder="Share your thoughts, tips, or questions..."
                placeholderTextColor="rgba(0,0,0,0.45)"
                multiline
                style={styles.textArea}
                maxLength={maxChars}
                textAlignVertical="top"
                returnKeyType="default"
                blurOnSubmit={false}
                scrollEnabled={true}
              />
              <Text style={styles.counter}>
                {composerText.length}/{maxChars} characters
              </Text>

              {/* Assets row */}
              <Pressable onPress={openPicker} style={styles.assetRow}>
                <Feather name="image" size={16} color="#413833" />
                <Text style={styles.assetRowText}>Add Photos/Videos ({assets.length}/{maxAssets})</Text>
              </Pressable>

              {/* Image previews */}
              {assets.length > 0 ? (
                <HFlatList
                  horizontal
                  data={assets}
                  keyExtractor={(a, i) => `${a.uri}-${i}`}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingVertical: 8 }}
                  renderItem={({ item }) => <Image source={{ uri: item.uri }} style={styles.preview} />}
                  ListFooterComponent={<View style={{ width: 8 }} />}
                />
              ) : null}

              {/* Actions */}
              <View style={styles.modalActions}>
                <Pressable onPress={resetComposer} style={[styles.button, styles.btnGhost]}>
                  <Text style={styles.btnGhostText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={submitFromModal}
                  style={[styles.button, styles.btnPrimary, !composerText.trim() && { opacity: 0.4 }]}
                  disabled={!composerText.trim()} // enabled by text; category validated on press
                >
                  <Text style={styles.btnPrimaryText}>Post</Text>
                </Pressable>
              </View>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Header styles removed - now using inline styles to match shop screen

  // Categories (anti-clipping)
  catListView: { zIndex: 5, height: 34, flexGrow: 0, flexShrink: 0, marginBottom: 6 },
  catList: {
    paddingLeft: 16,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0, // no bottom padding to make input field directly below
  },
  catBtn: {
    position: "relative",
    height: 34,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
    marginRight: 14,
    overflow: "visible",
  },
  catText: {
    color: "rgba(255,255,255,0.78)",
    fontWeight: "600",
    fontSize: 14,
    lineHeight: 19,
    includeFontPadding: true,
    textAlignVertical: "center",
  },
  catTextActive: { color: "#fff" },
  catUnderline: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    borderRadius: 2,
    backgroundColor: "transparent",
  },
  catUnderlineActive: { backgroundColor: "rgba(255,255,255,0.9)" },

  // Faux composer (edge-to-edge + vertical space)
  fakeComposerShadow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  fakeComposer: {
    marginHorizontal: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fakeLeft: { flexDirection: "row", alignItems: "center" },
  fakeAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  fakePlaceholder: { color: "rgba(255,255,255,0.75)" },
  fakeActions: { flexDirection: "row", alignItems: "center" },
  fakeIconBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.10)",
    marginRight: 8,
  },
  fakePostPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "#fff" },
  fakePostPillText: { color: "#000", fontWeight: "700" },

  // Feed — only the feed scrolls; header anchors top
  feedList: { flex: 1, alignSelf: "stretch" },
  feedContent: {
    paddingHorizontal: 16,
    paddingTop: 0,
    flexGrow: 0,
  },

  error: { color: "rgb(255,180,180)", paddingHorizontal: 16, paddingTop: 8 },
  footer: { color: "rgba(255,255,255,0.8)", textAlign: "center", padding: 16 },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  // KeyboardAvoidingView wrapper
  kav: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#f5f1ee",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: Platform.OS === "ios" ? "85%" : "90%",
    minHeight: 300,
  },
  modalHeader: { alignItems: "center", justifyContent: "center", paddingBottom: 8 },
  modalTitle: { color: "#2d241f", fontWeight: "800", fontSize: 16 },
  closeBtn: { position: "absolute", right: 2, top: 2, padding: 8 },

  modalUserRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#e7dfdb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  userAvatarText: { color: "#6b5f5a", fontWeight: "800", fontSize: 12 },
  userName: { color: "#2d241f", fontWeight: "700" },
  userSub: { color: "#746862", fontSize: 12 },

  sectionLabel: { color: "#6b5f5a", fontWeight: "700", marginTop: 8 },
  sectionLabelError: { color: "#b02a37" },
  errorHint: { color: "#b02a37", fontSize: 12, marginTop: 4 },

  catChip: {
    backgroundColor: "#e7dfdb",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  catChipActive: { borderColor: "#2d241f" },
  catChipText: { color: "#2d241f", fontWeight: "700" },
  catChipTextActive: { color: "#2d241f" },

  textArea: {
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e6dfdb",
    minHeight: 110,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#2d241f",
    textAlignVertical: "top",
  },
  counter: { alignSelf: "flex-end", color: "#8b7f78", fontSize: 12 },

  assetRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  assetRowText: { color: "#413833", fontWeight: "700", marginLeft: 8 },

  preview: {
    width: 72,
    height: 72,
    borderRadius: 10,
    marginRight: 8,
    backgroundColor: "#ddd",
  },

  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    paddingTop: 10,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  btnGhost: {
    borderWidth: 1,
    borderColor: "#d6cec9",
    backgroundColor: "transparent",
  },
  btnGhostText: { color: "#6b5f5a", fontWeight: "700" },
  btnPrimary: { backgroundColor: "#8e7e76" },
  btnPrimaryText: { color: "#fff", fontWeight: "800" },
});
