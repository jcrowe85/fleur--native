import React, { useState } from "react";
import { View, Text, Image, StyleSheet, Pressable, Platform, ScrollView } from "react-native";
import { BlurView } from "expo-blur";
import { Feather, FontAwesome } from "@expo/vector-icons"; // ⬅️ add FontAwesome
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
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "AN";
}

export function PostCard({ post }: { post: PostItem }) {
  const display = post.author?.display_name ?? post.author?.handle ?? "Anonymous User";
  const { toggle } = useLikesService();
  const { open } = useCommentsSheet();

  const [liked, setLiked] = useState(!!post.liked_by_me);
  const [count, setCount] = useState(post.comments_count ?? 0);
  const likeCount = (post as any).likes_count as number | undefined;

  // Normalize media (always array)
  const media: string[] = Array.isArray((post as any).media_urls)
    ? (post as any).media_urls
    : post.media_url
    ? [post.media_url]
    : [];

  const [activeIndex, setActiveIndex] = useState(0);
  const mainUrl = media[activeIndex] ?? null;

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
      <View style={styles.cardWrap}>
        <BlurView
          intensity={Platform.OS === "ios" ? 24 : 14}
          tint="light"
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.glassTint} />

        <View style={styles.inner}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(display)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.handle}>{display}</Text>
              <Text style={styles.meta}>{timeAgo(post.created_at)}</Text>
            </View>
          </View>

          {/* Body */}
          {post.body ? <Text style={styles.body}>{post.body}</Text> : null}

          {/* Main Media (left-aligned, rounded via wrapper) */}
          {mainUrl ? (
            <View style={styles.mediaContainer}>
              <Image
                source={{ uri: mainUrl }}
                style={styles.mainMedia}
                resizeMode="cover"
                accessibilityLabel="Post media"
              />
            </View>
          ) : null}

          {/* Thumbnails */}
          {media.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.thumbRow}
              contentContainerStyle={{ paddingTop: 8 }}
            >
              {media.map((uri, i) => (
                <Pressable
                  key={`${uri}-${i}`}
                  onPress={() => setActiveIndex(i)}
                  style={[styles.thumbWrap, i === activeIndex && styles.thumbActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`Show image ${i + 1}`}
                >
                  <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
                </Pressable>
              ))}
            </ScrollView>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable onPress={onToggleLike} style={styles.iconRow} hitSlop={8}>
              <View style={styles.heartStack}>
                {liked ? (
                  <FontAwesome
                    name="heart"
                    size={18}
                    color="#ff3b30"
                    style={styles.heartFill}
                  />
                ) : null}
                <Feather
                  name="heart"
                  size={18}
                  color={liked ? "#ff3b30" : "rgba(255,255,255,0.9)"}
                />
              </View>
              {typeof likeCount === "number" ? (
                <Text style={styles.iconText}>{likeCount}</Text>
              ) : null}
            </Pressable>

            <Pressable
              onPress={() =>
                open(post.id, {
                  onAdded: (n) => setCount((c) => c + n),
                  onDelta: (n) => setCount((c) => c + n),
                })
              }
              style={styles.iconRow}
            >
              <Feather name="message-circle" size={18} color="rgba(255,255,255,0.9)" />
              <Text style={styles.iconText}>{count}</Text>
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
  cardWrap: {
    borderRadius: RADIUS,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  glassTint: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.06)" },
  inner: { padding: 16 },

  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 12 },

  handle: { color: "#fff", fontWeight: "700" },
  meta: { color: "rgba(255,255,255,0.75)", fontSize: 12 },

  body: { color: "rgba(255,255,255,0.98)", marginTop: 6, marginBottom: 10, lineHeight: 20 },

  mediaContainer: {
    marginTop: 6,
    borderRadius: 14,
    overflow: "hidden",
    alignSelf: "flex-start",
  },

  mainMedia: {
    width: 280,
    height: 280,
  },

  thumbRow: { marginTop: 4 },
  thumbWrap: {
    width: 64,
    height: 64,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    marginRight: 8,
    opacity: 0.85,
  },
  thumbActive: { borderColor: "#fff", opacity: 1 },
  thumb: { width: "100%", height: "100%" },

  actions: { flexDirection: "row", gap: 18, paddingTop: 12, alignItems: "center" },
  iconRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 },
  iconText: { color: "rgba(255,255,255,0.9)", fontWeight: "600" },

  // heart overlay styles
  heartStack: {
    position: "relative",
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  heartFill: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});
