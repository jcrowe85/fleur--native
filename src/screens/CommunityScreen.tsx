// src/screens/CommunityScreen.tsx
import React, { useState } from "react";
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFeed } from "@/features/community/useFeed";
import { PostCard } from "@/features/community/PostCard";
import { usePostsService } from "@/features/community/posts.service";

export default function CommunityScreen() {
  const { items, hasMore, loadMore, refresh, refreshing, loading, error } = useFeed();
  const { create } = usePostsService();
  const [text, setText] = useState("");
  const insets = useSafeAreaInsets();

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    await create({ body: trimmed }); // guard runs inside
    setText("");
    await refresh(); // pull fresh first page
  }

  return (
    <View className="flex-1 bg-brand-bg">
      {/* same background + gradient as dashboard */}
      <ImageBackground
        source={require("../../assets/dashboard.png")} // same pathing style as dashboard.tsx
        resizeMode="cover"
        className="absolute inset-0"
      />
      <LinearGradient
        colors={["rgba(0,0,0,0.10)", "rgba(0,0,0,0.35)", "rgba(0,0,0,0.70)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        className="absolute inset-0"
      />

      <SafeAreaView className="flex-1" edges={["top", "left", "right"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Composer (glass-lite) */}
          <View style={styles.composerShadow}>
            <View style={styles.composer}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Share a tip, question, or win…"
                placeholderTextColor="rgba(255,255,255,0.6)"
                style={styles.input}
                multiline
              />
              <Pressable onPress={submit} style={styles.postBtn}>
                <Text style={styles.postBtnText}>Post</Text>
              </Pressable>
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <FlatList
            data={items}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{
              padding: 16,
              paddingTop: 8,
              paddingBottom: insets.bottom + 28,
            }}
            renderItem={({ item }) => <PostCard post={item} />}
            onEndReachedThreshold={0.4}
            onEndReached={() => hasMore && loadMore()}
            refreshing={refreshing}
            onRefresh={refresh}
            ListFooterComponent={loading ? <Text style={styles.footer}>Loading…</Text> : null}
            showsVerticalScrollIndicator={false}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  composerShadow: {
    paddingHorizontal: 16,
    paddingTop: 16,
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
  input: { color: "#fff", minHeight: 48 },
  postBtn: {
    alignSelf: "flex-end",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#fff",
    marginTop: 8,
  },
  postBtnText: { color: "#000", fontWeight: "700" },
  error: { color: "#ffb4b4", paddingHorizontal: 16, paddingTop: 8 },
  footer: { color: "rgba(255,255,255,0.8)", textAlign: "center", padding: 16 },
});
