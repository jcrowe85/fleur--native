import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ImageBackground,
  Platform,
} from "react-native";
import { FlatList as HFlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { listArticles, filterArticles } from "@/lib/articles";
import { supabase } from "@/services/supabase";
import type { Article, EduCategory } from "../features/education/types";
import { ScreenFlatList } from "@/components/UI/bottom-space";

const CATS: { key: EduCategory; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "Peptides 101", icon: "droplet" },
  { key: "Hair Science", icon: "book-open" },
  { key: "Hair Wellness", icon: "heart" },
  { key: "Natural Care", icon: "feather" },
];

export default function EducationScreen() {
  const [all, setAll] = useState<Article[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<EduCategory | "All">("All");
  const [loading, setLoading] = useState(true);

  // Single load function reused by focus, pull-to-refresh, and realtime
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listArticles();
      setAll(rows);
    } catch (e) {
      console.warn("Failed to load articles:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Supabase Realtime: refresh when articles change
  useEffect(() => {
    const channel = supabase
      .channel("articles-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "articles" },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const items = useMemo(
    () => filterArticles(all, { q, category: cat }),
    [all, q, cat]
  );

  const ListHeader = (
    <View>
      {/* Centered header */}
      <View style={styles.headerWrap}>
        <Text style={styles.headerTitle}>Education</Text>
        <Text style={styles.headerSub}>Science-backed hair care knowledge</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Feather name="search" size={16} color="rgba(255,255,255,0.7)" />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search articles..."
          placeholderTextColor="rgba(255,255,255,0.6)"
          style={styles.searchInput}
          returnKeyType="search"
        />
      </View>

      {/* Category grid (large squares) */}
      <View style={styles.grid}>
        {CATS.map((c) => {
          const active = cat === c.key;
          return (
            <Pressable
              key={c.key}
              onPress={() => setCat((prev) => (prev === c.key ? "All" : c.key))}
              style={[styles.catCard, active && styles.catActive]}
            >
              <Feather name={c.icon} size={20} color="#fff" />
              <Text style={styles.catText}>{c.key}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Featured Articles</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#120d0a" }}>
      {/* Background image + subtle blur */}
      <ImageBackground
        source={require("../../assets/dashboard.png")}
        resizeMode="cover"
        style={StyleSheet.absoluteFillObject as any}
      />
      <BlurView
        intensity={Platform.OS === "ios" ? 0 : 10}
        tint="dark"
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safeBody} edges={["top", "left", "right"]}>
        <ScreenFlatList<Article>
          style={styles.feedList}
          data={items}
          keyExtractor={(a) => a.slug}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.feedContent} // bottom padding handled by ScreenFlatList
          renderItem={({ item }) => <ArticleCard item={item} />}
          ListEmptyComponent={
            loading ? null : (
              <Text
                style={{
                  color: "rgba(255,255,255,0.8)",
                  textAlign: "center",
                  marginTop: 24,
                }}
              >
                No articles found.
              </Text>
            )
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </SafeAreaView>
    </View>
  );
}

function ArticleCard({ item }: { item: Article }) {
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/(app)/education/[slug]",
          params: { slug: item.slug },
        })
      }
      style={styles.cardShadow}
    >
      <View style={styles.card}>
        <View style={styles.cardIcon}>
          <Feather name={pickIcon(item.category)} size={18} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          {item.excerpt ? (
            <Text style={styles.cardExcerpt}>{item.excerpt}</Text>
          ) : null}

          <View style={styles.metaRow}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{item.category}</Text>
            </View>
            {item.read_minutes ? (
              <Text style={styles.metaText}>{item.read_minutes} min read</Text>
            ) : null}
            {item.audio_available ? (
              <Text style={styles.metaText}>Audio available</Text>
            ) : null}
          </View>
        </View>
        <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.9)" />
      </View>
    </Pressable>
  );
}

function pickIcon(cat: EduCategory): keyof typeof Feather.glyphMap {
  switch (cat) {
    case "Peptides 101":
      return "droplet";
    case "Hair Science":
      return "book-open";
    case "Hair Wellness":
      return "heart";
    case "Natural Care":
      return "feather";
    default:
      return "file-text";
  }
}

const R = 18;

const styles = StyleSheet.create({
  // ----- layout -----
  safeBody: { flex: 1, justifyContent: "flex-start", alignItems: "stretch" },

  headerWrap: {
    paddingHorizontal: 16,
    paddingTop: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 4 },

  feedList: { flex: 1, alignSelf: "stretch" },
  feedContent: {
    paddingHorizontal: 16,
    paddingTop: 0,
    flexGrow: 0,
  },

  // ----- search -----
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 0,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: R,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  searchInput: { flex: 1, color: "#fff" },

  // ----- category grid -----
  grid: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  catCard: {
    width: "48%",
    height: 88,
    borderRadius: R,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  catActive: { backgroundColor: "rgba(255,255,255,0.12)" },
  catText: { color: "#fff", fontWeight: "700", textAlign: "center" },

  sectionTitle: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
    marginTop: 14,
  },

  // ----- article cards -----
  cardShadow: {
    marginTop: 10,
    borderRadius: R,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  card: {
    borderRadius: R,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.06)",
    padding: 12,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  cardIcon: {
    width: 30,
    height: 30,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  cardTitle: { color: "#fff", fontWeight: "800", fontSize: 16, marginBottom: 6 },
  cardExcerpt: { color: "rgba(255,255,255,0.92)", marginBottom: 8 },
  metaRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  pillText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  metaText: { color: "rgba(255,255,255,0.85)", fontSize: 12 },
});
