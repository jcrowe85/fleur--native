// src/features/community/PostCard.tsx
import React, { useState } from "react";
import { View, Text, Image, StyleSheet, Pressable, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import type { PostItem } from "./types";
import { useLikesService } from "./likes.service";
import { useCommentsSheet } from "./commentsSheet";

function timeAgo(iso: string) {
  const s = Math.max(1, (Date.now() - new Date(iso).getTime()) / 1000);
  const mins = s / 60, hrs = mins / 60, days = hrs / 24;
  if (s < 60) return `${Math.floor(s)}s`;
  if (mins < 60) return `${Math.floor(mins)}m`;
  if (hrs < 24) return `${Math.floor(hrs)}h`;
  return `${Math.floor(days)}d`;
}
function initials(name?: string | null) {
  if (!name) return "AN";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() ?? "").join("") || "AN";
}

export function PostCard({ post }: { post: PostItem }) {
  const display = post.author?.display_name ?? post.author?.handle ?? "Anonymous User";
  const { toggle } = useLikesService();
  const { open } = useCommentsSheet();
  const [liked, setLiked] = useState(!!post.liked_by_me);

  async function onToggleLike() {
    const prev = liked;
    setLiked(!prev);
    try {
      const nowLiked = await toggle(post.id);
      setLiked(nowLiked);
    } catch {
      setLiked(prev);
    }
  }

  return (
    <View style={styles.shadow}>
      {/* Wrapper does the rounding/clip/border. Blur is absolutely-filled inside. */}
      <View style={styles.cardWrap}>
        <BlurView
          intensity={Platform.OS === "ios" ? 24 : 14}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
        {/* warm glass tint ON THE WRAPPER (not on BlurView) */}
        <View style={styles.glassTint} />

        <View style={styles.inner}>
          <View style={styles.headerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(display)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.handle}>{display}</Text>
              <Text style={styles.meta}>{timeAgo(post.created_at)}</Text>
            </View>
            <Pressable style={styles.iconBtn} onPress={() => { /* TODO share */ }}>
              <Feather name="share-2" size={16} color="rgba(255,255,255,0.9)" />
            </Pressable>
          </View>

          {post.body ? <Text style={styles.body}>{post.body}</Text> : null}
          {post.media_url ? (
            <Image source={{ uri: post.media_url }} style={styles.media} resizeMode="cover" />
          ) : null}

          <View style={styles.actions}>
            <Pressable onPress={onToggleLike} style={styles.chip}>
              <Feather name="heart" size={16} color={liked ? "#fff" : "rgba(255,255,255,0.85)"} />
              <Text style={[styles.chipText, liked && { color: "#fff", fontWeight: "700" }]}>
                {liked ? "Liked" : "Like"}
              </Text>
            </Pressable>

            <Pressable onPress={() => open(post.id)} style={styles.chip}>
              <Feather name="message-circle" size={16} color="rgba(255,255,255,0.85)" />
              <Text style={styles.chipText}>
                {typeof post.comments_count === "number" && post.comments_count > 0
                  ? `Comment (${post.comments_count})`
                  : "Comment"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const RADIUS = 22;

const styles = StyleSheet.create({
  shadow: {
    borderRadius: RADIUS,
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16,
    marginBottom: 14,
  },
  // The wrapper provides the rounded clip and border (fixes Android square artifact).
  cardWrap: {
    borderRadius: RADIUS,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.04)", // subtle base so glass feels warm
  },
  glassTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.06)", // warm haze
  },
  inner: { padding: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  avatar: {
    width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center",
    marginRight: 10, backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  handle: { color: "#fff", fontWeight: "700" },
  meta: { color: "rgba(255,255,255,0.75)", fontSize: 12 },
  iconBtn: {
    padding: 8, borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", marginLeft: 8,
  },
  body: { color: "rgba(255,255,255,0.98)", marginTop: 6, marginBottom: 10, lineHeight: 20 },
  media: { width: "100%", height: 190, borderRadius: 14, marginTop: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
  actions: { flexDirection: "row", gap: 10, paddingTop: 10 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.22)",
  },
  chipText: { color: "rgba(255,255,255,0.9)", fontWeight: "600" },
});
