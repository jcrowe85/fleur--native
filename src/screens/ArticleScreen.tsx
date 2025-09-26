// src/screens/ArticleScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
  Platform,
  Pressable,
  Linking,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { getArticleBySlug } from "@/lib/articles";
import type { Article } from "../features/education/types";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenScrollView } from "@/components/UI/bottom-space";

export default function ArticleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [a, setA] = useState<Article | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const found = slug ? await getArticleBySlug(String(slug)) : null;
      if (mounted) setA(found ?? null);
    })();
    return () => {
      mounted = false;
    };
  }, [slug]);

  if (!a) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#fff" }}>Loading…</Text>
      </View>
    );
  }

  // Use body_md from DB
  const lines = (a.body_md ?? "").split("\n");

  return (
    <View style={{ flex: 1, backgroundColor: "#120d0a" }}>
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
        <ScreenScrollView
          contentContainerStyle={{ paddingHorizontal: 16 }}
          bottomExtra={20}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerWrap}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 16, position: "relative" }}>
              <Pressable
                onPress={() => {
                  if (router.canGoBack()) router.back();
                  else router.replace("/(app)/education");
                }}
                hitSlop={10}
                style={[styles.backButton, { padding: 8, borderRadius: 20 }]}
              >
                <Feather name="arrow-left" size={18} color="#fff" />
              </Pressable>

              <View style={{ alignItems: "center", paddingHorizontal: 50 }}>
                <Text style={styles.headerTitle} numberOfLines={2} ellipsizeMode="tail">
                  {a.title}
                </Text>
                <Text style={styles.headerSub}>Science-backed hair care knowledge</Text>
              </View>
            </View>
          </View>

          {/* Meta row */}
          <View style={styles.metaRow}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{a.category}</Text>
            </View>
            {a.read_minutes ? (
              <Text style={styles.metaText}>{a.read_minutes} min read</Text>
            ) : null}
            {a.audio_available ? (
              <View style={styles.metaBadge}>
                <Feather name="headphones" size={14} color="#fff" />
                <Text style={styles.metaBadgeText}>Audio</Text>
              </View>
            ) : null}
          </View>

          {/* Body */}
          <View style={{ marginTop: 18, gap: 8 }}>
            {lines.map((raw, i) => {
              const line = raw.replace(/\r$/, "");
              const trimmed = line.trim();

              if (trimmed.length === 0) return <View key={i} style={{ height: 8 }} />;
              if (trimmed === "---") return <View key={i} style={styles.rule} />;

              // Headings
              if (trimmed.startsWith("### ")) {
                return (
                  <Text key={i} style={styles.h3}>
                    {trimmed.replace(/^###\s*/, "")}
                  </Text>
                );
              }
              if (trimmed.startsWith("## ")) {
                return (
                  <Text key={i} style={styles.h2}>
                    {trimmed.replace(/^##\s*/, "")}
                  </Text>
                );
              }
              if (trimmed.startsWith("# ")) {
                return (
                  <Text key={i} style={styles.h1}>
                    {trimmed.replace(/^#\s*/, "")}
                  </Text>
                );
              }

              // Bullets
              if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                return (
                  <View key={i} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.body}>{renderInline(trimmed.replace(/^[-*]\s*/, ""), i)}</Text>
                  </View>
                );
              }

              // Paragraph with inline markdown
              return (
                <Text key={i} style={styles.body}>
                  {renderInline(line, i)}
                </Text>
              );
            })}
          </View>
        </ScreenScrollView>
      </SafeAreaView>
    </View>
  );
}

/** Lightweight inline markdown renderer for **bold**, *italic*, ***bold+italic***, `code`, and [links](url). */
function renderInline(text: string, keySeed: number) {
  // Order matters: code -> bold+italic -> bold -> italic -> link
  // We'll token-scan left-to-right using a single regex and interpret matches.
  const regex =
    /(`[^`]+`)|(\*\*\*[^*]+?\*\*\*)|(\*\*[^*]+?\*\*)|(\*[^*]+?\*)|(\[([^\]]+)\]\(([^)]+)\))/g;

  const out: React.ReactNode[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  let partIndex = 0;

  while ((m = regex.exec(text)) !== null) {
    const { index } = m;
    if (index > lastIndex) {
      out.push(
        <Text key={`t-${keySeed}-${partIndex++}`} style={styles.body}>
          {text.slice(lastIndex, index)}
        </Text>
      );
    }

    const [full] = m;

    // `code`
    if (m[1]) {
      out.push(
        <Text key={`c-${keySeed}-${partIndex++}`} style={styles.code}>
          {full.slice(1, -1)}
        </Text>
      );
    }
    // ***bold+italic***
    else if (m[2]) {
      out.push(
        <Text key={`bi-${keySeed}-${partIndex++}`} style={[styles.body, styles.boldItalic]}>
          {full.slice(3, -3)}
        </Text>
      );
    }
    // **bold**
    else if (m[3]) {
      out.push(
        <Text key={`b-${keySeed}-${partIndex++}`} style={[styles.body, styles.bold]}>
          {full.slice(2, -2)}
        </Text>
      );
    }
    // *italic*
    else if (m[4]) {
      out.push(
        <Text key={`i-${keySeed}-${partIndex++}`} style={[styles.body, styles.italic]}>
          {full.slice(1, -1)}
        </Text>
      );
    }
    // [text](url)
    else if (m[5]) {
      const label = m[6];
      const url = m[7];
      out.push(
        <Text
          key={`l-${keySeed}-${partIndex++}`}
          style={styles.link}
          onPress={() => {
            if (url) Linking.openURL(url).catch(() => {});
          }}
        >
          {label}
        </Text>
      );
    }

    lastIndex = index + full.length;
  }

  if (lastIndex < text.length) {
    out.push(
      <Text key={`t-${keySeed}-${partIndex++}`} style={styles.body}>
        {text.slice(lastIndex)}
      </Text>
    );
  }
  return out;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#120d0a",
  },
  safeBody: { flex: 1, justifyContent: "flex-start", alignItems: "stretch" },

  headerWrap: {
    paddingTop: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "600", textAlign: "center" },
  headerSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 4, textAlign: "center" },
  backButton: {
    position: "absolute",
    left: 16,
    top: -8,
  },

  metaRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginTop: 12,
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
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  metaBadgeText: { color: "#fff", fontWeight: "700", fontSize: 12 },

  h1: { color: "#fff", fontWeight: "800", fontSize: 20, marginTop: 8 },
  h2: { color: "#fff", fontWeight: "800", fontSize: 18, marginTop: 8 },
  h3: { color: "#fff", fontWeight: "800", fontSize: 16, marginTop: 8 },

  body: { color: "rgba(255,255,255,0.95)", lineHeight: 20 },
  bold: { fontWeight: "800" },
  italic: { fontStyle: "italic" },
  boldItalic: { fontWeight: "800", fontStyle: "italic" },
  code: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    backgroundColor: "rgba(255,255,255,0.10)",
    borderColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    color: "#fff",
  },
  link: {
    color: "#9ad0ff",
    textDecorationLine: "underline",
  },

  rule: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginVertical: 8,
  },
  bulletRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  bulletDot: { color: "rgba(255,255,255,0.95)", lineHeight: 20 },
});
