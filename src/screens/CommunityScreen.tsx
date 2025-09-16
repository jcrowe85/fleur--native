// src/screens/CommunityScreen.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
} from "react-native";
import { FlatList as HFlatList } from "react-native"; // horizontal list alias for categories
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useFeed } from "@/features/community/useFeed";
import { PostCard } from "@/features/community/PostCard";
import { usePostsService } from "@/features/community/posts.service";

const CATEGORIES = ["Hair Journeys", "Tips & Tricks", "Before & After"] as const;

export default function CommunityScreen() {
  const { items, hasMore, loadMore, refresh, loading, error } = useFeed();
  const { create } = usePostsService();
  const [text, setText] = useState("");
  const [activeCat, setActiveCat] = useState<(typeof CATEGORIES)[number]>("Hair Journeys");
  const insets = useSafeAreaInsets();

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    await create({ body: trimmed });
    setText("");
    await refresh();
  }

  // TODO: wire to real category when column exists
  const filtered = useMemo(() => items, [items, activeCat]);

  return (
    <View style={{ flex: 1, backgroundColor: "#120d0a" }}>
      <ImageBackground
        source={require("../../assets/dashboard.png")}
        resizeMode="cover"
        style={StyleSheet.absoluteFillObject as any}
      />
      <LinearGradient
        colors={["rgba(0,0,0,0.10)", "rgba(0,0,0,0.35)", "rgba(0,0,0,0.70)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject as any}
      />

      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Centered header */}
          <View style={styles.headerWrap}>
            <Text style={styles.headerTitle}>Community</Text>
            <Text style={styles.headerSub}>Share your hair journey</Text>
          </View>

          {/* Categories — horizontal FlatList + trailing spacer (prevents clipping) */}
          <HFlatList
            horizontal
            data={CATEGORIES}
            keyExtractor={(c) => c}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catList}
            style={styles.catListView}
            renderItem={({ item }) => {
              const active = item === activeCat;
              return (
                <Pressable onPress={() => setActiveCat(item)} style={styles.catBtn}>
                  <Text
                    style={[styles.catText, active && styles.catTextActive]}
                    numberOfLines={1}
                  >
                    {item}
                  </Text>
                  <View style={[styles.catUnderline, active && styles.catUnderlineActive]} />
                </Pressable>
              );
            }}
            ListFooterComponent={<View style={{ width: 16 }} />}
          />

          {/* Composer */}
          <View style={styles.composerShadow}>
            <View style={styles.composer}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Share your hair journey…"
                placeholderTextColor="rgba(255,255,255,0.7)"
                style={styles.input}
                multiline
              />
              <View style={styles.composerActions}>
                <Pressable
                  onPress={() => {}}
                  style={styles.iconBtn}
                  accessibilityLabel="Add photo"
                >
                  <Feather name="camera" size={18} color="rgba(255,255,255,0.95)" />
                </Pressable>
                <Pressable onPress={submit} style={styles.postBtn}>
                  <Text style={styles.postBtnText}>Post</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Feed */}
          <FlatList
            data={filtered}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: insets.bottom + 28,
            }}
            renderItem={({ item }) => <PostCard post={item} />}
            onEndReachedThreshold={0.4}
            onEndReached={() => hasMore && loadMore()}
            ListFooterComponent={loading ? <Text style={styles.footer}>Loading…</Text> : null}
            showsVerticalScrollIndicator={false}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: 16,
    paddingTop: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 4 },

  // Categories (anti-clipping)
  catListView: {
    zIndex: 5,
  },
  catList: {
    paddingLeft: 16, // left padding is respected on Android
    paddingRight: 0, // trailing right padding is unreliable on some builds
    paddingTop: 12,
    paddingBottom: 6,
  },
  catBtn: {
    position: "relative",
    height: 34, // real height prevents vertical crop
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
    lineHeight: 19,           // slightly > fontSize to avoid top cut
    includeFontPadding: true, // Android: keep font ascent/descent padding
    textAlignVertical: "center",
  },
  catTextActive: { color: "#fff" },
  catUnderline: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -1,
    height: 2,
    borderRadius: 2,
    backgroundColor: "transparent",
  },
  catUnderlineActive: {
    backgroundColor: "rgba(255,255,255,0.9)",
  },

  // Composer (glass)
  composerShadow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  composer: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  input: { color: "#fff", minHeight: 46, lineHeight: 20 },
  composerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  iconBtn: {
    padding: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    marginRight: 10,
  },
  postBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#fff",
  },
  postBtnText: { color: "#000", fontWeight: "700" },

  error: { color: "rgb(255,180,180)", paddingHorizontal: 16, paddingTop: 8 },
  footer: { color: "rgba(255,255,255,0.8)", textAlign: "center", padding: 16 },
});
