import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { useLocalSearchParams, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { getArticleBySlug } from "@/features/education/articles.service";
import type { Article } from "@/features/education/types";

export default function ArticleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [a, setA] = useState<Article | null>(null);

  useEffect(() => {
    (async () => {
      const row = await getArticleBySlug(String(slug));
      setA(row);
    })();
  }, [slug]);

  if (!a) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#fff" }}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <BlurView intensity={Platform.OS === "ios" ? 24 : 14} tint="dark" style={StyleSheet.absoluteFillObject} />
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={18} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Article</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.card}>
          <View style={styles.metaRow}>
            <View style={styles.iconWrap}>
              <Feather name="bookmark" size={18} color="#fff" />
            </View>
            <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
              <Pill label={a.category} />
              {a.read_minutes ? <Meta text={`${a.read_minutes} min read`} /> : null}
              {a.audio_available ? <Meta text="Audio available" /> : null}
            </View>
          </View>

          <Text style={styles.title}>{a.title}</Text>
          {a.excerpt ? <Text style={styles.excerpt}>{a.excerpt}</Text> : null}

          {/* Render markdown very simply; if you use a renderer, swap this block */}
          {a.body_md.split("\n").map((line, i) => {
            if (line.startsWith("## ")) {
              return (
                <Text key={i} style={styles.h2}>
                  {line.replace(/^##\s+/, "")}
                </Text>
              );
            }
            if (line.startsWith("### ")) {
              return (
                <Text key={i} style={styles.h3}>
                  {line.replace(/^###\s+/, "")}
                </Text>
              );
            }
            if (line.trim() === "---") {
              return <View key={i} style={styles.hr} />;
            }
            return (
              <Text key={i} style={styles.body}>
                {line.length ? line : " "}
              </Text>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}
function Meta({ text }: { text: string }) {
  return <Text style={styles.meta}>{text}</Text>;
}

const R = 18;

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)",
  },
  headerTitle: { color: "#fff", fontWeight: "700", fontSize: 16 },

  card: {
    borderRadius: R,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.06)",
    padding: 14,
  },

  metaRow: { flexDirection: "row", gap: 10, alignItems: "center", marginBottom: 10 },
  iconWrap: {
    width: 30, height: 30, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.18)",
  },
  pill: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)",
  },
  pillText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  meta: { color: "rgba(255,255,255,0.85)", fontSize: 12 },

  title: { color: "#fff", fontWeight: "800", fontSize: 20, marginBottom: 8 },
  excerpt: { color: "rgba(255,255,255,0.92)", marginBottom: 16 },

  h2: { color: "#fff", fontWeight: "800", fontSize: 16, marginTop: 16, marginBottom: 8 },
  h3: { color: "#fff", fontWeight: "700", fontSize: 14, marginTop: 12, marginBottom: 6 },
  body: { color: "rgba(255,255,255,0.95)", lineHeight: 20 },
  hr: { height: 1, backgroundColor: "rgba(255,255,255,0.15)", marginVertical: 12 },
});
