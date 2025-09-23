// app/summary.tsx
import React from "react";
import { View, Text, ImageBackground, ScrollView, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { usePlanStore } from "@/state/planStore";

/* ----------------- Coercion ----------------- */
type Confidence = "Low" | "Medium" | "High";
type SummaryIcon =
  | "heart" | "zap" | "droplet" | "activity" | "coffee"
  | "feather" | "thermometer" | "moon" | "shield" | "star";

type SummaryCoerced = {
  primary: { title: string; paragraph: string; confidence: Confidence };
  drivers: Array<{ icon: SummaryIcon; label: string }>;
  quickWins: string[];
  headsUp: string;
};

const FEATHER_ICONS = new Set([
  "heart","zap","droplet","activity","coffee","feather","thermometer","moon","shield","star",
  "bookmark","map-pin","zap","alert-triangle","clock"
]);

function asConfidence(v: any): Confidence {
  return v === "Low" || v === "Medium" || v === "High" ? v : "Medium";
}
function asIcon(v: any, fallback: SummaryIcon = "star"): SummaryIcon {
  return FEATHER_ICONS.has(v) ? (v as SummaryIcon) : fallback;
}

function coerceSummary(raw: any): SummaryCoerced | null {
  if (!raw) return null;

  if (raw.primary || raw.quickWins || raw.drivers || raw.headsUp) {
    const title = String(raw?.primary?.title ?? "Your Hair Summary");
    const paragraph = String(
      raw?.primary?.paragraph ?? "Your personalized summary will appear here once it’s ready."
    );
    const confidence = asConfidence(raw?.primary?.confidence);

    const drivers = Array.isArray(raw?.drivers)
      ? raw.drivers
          .map((d: any) => ({ icon: asIcon(d?.icon, "star"), label: String(d?.label ?? "").trim() }))
          .filter((d) => d.label.length)
      : [];

    const quickWins = Array.isArray(raw?.quickWins)
      ? raw.quickWins.map((q: any) => String(q)).filter(Boolean)
      : [];

    const headsUp = raw?.headsUp ? String(raw.headsUp) : "";

    return { primary: { title, paragraph, confidence }, drivers, quickWins, headsUp };
  }

  if (raw.headline || raw.subhead || raw.why) {
    const title = String(raw.headline ?? "Your Hair Summary");
    const paragraph = String(raw.subhead ?? "Your personalized summary will appear here once it’s ready.");
    const quickWins = Array.isArray(raw?.why) ? raw.why.map((q: any) => String(q)).filter(Boolean) : [];
    return { primary: { title, paragraph, confidence: "Medium" }, drivers: [], quickWins, headsUp: "" };
  }

  return null;
}

/* Title limiter (no ellipsis) */
function limitTitle(input: string, maxWords = 8, maxChars = 72): string {
  if (!input) return "";
  const words = input.trim().split(/\s+/).slice(0, maxWords);
  let s = words.join(" ");
  if (s.length > maxChars) s = s.slice(0, maxChars).trim();
  return s;
}

/* ----------------- Screen ----------------- */
export default function Summary() {
  const insets = useSafeAreaInsets();
  const plan = usePlanStore((s) => s.plan);

  const s = React.useMemo(() => coerceSummary(plan?.summary), [plan]);

  return (
    <View className="flex-1 bg-brand-bg">
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <ImageBackground
        source={require("../../../assets/dashboard.png")}
        resizeMode="cover"
        className="absolute inset-0"
      >
      </ImageBackground>

      <SafeAreaView className="flex-1" edges={["top", "left", "right"]}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 28 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="flex-row items-center justify-center mb-6" style={{ paddingTop: 8 }}>
            <View style={{ alignItems: "center" }}>
              <Text className="text-white text-[22px] font-semibold text-center">Your Hair Summary</Text>
              <Text className="text-white/80 text-sm text-center mt-1">
                What we found and how we'll help over the next 6–8 weeks
              </Text>
            </View>
          </View>

          {/* Loading / fallback */}
          {!s ? (
            <GlassCard className="p-5 mb-6">
              <SectionHeader icon="clock" title="Preparing your plan…" />
              <Text className="text-white/80">
                We’re still finishing up. Please restart setup if this persists.
              </Text>
              <Pressable
                onPress={() => router.replace("/(plan)/summary")}
                className="mt-4 w-full rounded-full bg-white items-center py-3 active:opacity-90"
              >
                <Text className="text-brand-bg font-semibold">Retry</Text>
              </Pressable>
            </GlassCard>
          ) : (
            <>
              {/* Primary insight */}
              <GlassCard className="p-5 mb-6">
                <SectionHeader icon="bookmark" title={limitTitle(s.primary.title, 8, 72)} />
                <Text className="text-white/90 leading-snug mb-3">{s.primary.paragraph}</Text>
                <ConfidenceBar level={s.primary.confidence} />
              </GlassCard>

              {/* Drivers */}
              <GlassCard className="p-5 mb-6">
                <SectionHeader icon="map-pin" title="What’s driving this" />
                <View className="flex-row flex-wrap -mx-1">
                  {s.drivers?.length ? (
                    s.drivers.map((d, i) => (
                      <View key={i} className="px-1 py-1">
                        <Chip icon={d.icon as any} label={d.label} />
                      </View>
                    ))
                  ) : (
                    <Text className="text-white/70">No specific drivers flagged.</Text>
                  )}
                </View>
              </GlassCard>

              {/* Quick wins */}
              <GlassCard className="p-5 mb-6">
                <SectionHeader icon="zap" title="Quick wins (next 2 weeks)" />
                <View className="mt-1">
                  {s.quickWins?.length ? (
                    s.quickWins.map((q, i) => <BulletRow key={i} text={q} />)
                  ) : (
                    <Text className="text-white/70">No quick wins available.</Text>
                  )}
                </View>
              </GlassCard>

              {!!s.headsUp && (
                <GlassCard className="p-5 mb-6">
                  <SectionHeader icon="alert-triangle" title="Heads up" />
                  <Text className="text-white/85 text-sm leading-snug">• {s.headsUp}</Text>
                </GlassCard>
              )}

              {/* CTAs: proceed through onboarding flow */}
              <Pressable
                onPress={() => router.push("/routine-overview")}
                className="w-full rounded-full bg-white items-center py-3 active:opacity-90 mb-3"
              >
                <Text className="text-brand-bg font-semibold">View Routine</Text>
              </Pressable>
              {/* <Pressable
                onPress={() => router.push("/recommendations")}
                className="w-full rounded-full border border-white/40 bg-white/10 items-center py-3 active:opacity-90"
              >
                <Text className="text-white font-semibold">See My Kit</Text>
              </Pressable> */}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/* ------- UI bits ------- */
function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <View className={["rounded-2xl overflow-hidden border border-white/20", className].join(" ")}>
      <BlurView intensity={20} tint="light" className="absolute inset-0" />
      <View className="relative">{children}</View>
    </View>
  );
}
function SectionHeader({ icon, title }: { icon: keyof typeof Feather.glyphMap; title: string }) {
  return (
    <View className="flex-row items-start mb-3">
      <Feather name={icon} size={18} color="#fff" style={{ marginRight: 8, marginTop: 2 }} />
      <Text className="text-white font-semibold" style={{ flex: 1, flexShrink: 1, paddingRight: 4, lineHeight: 20 }}>
        {title}
      </Text>
    </View>
  );
}
function Chip({ icon, label }: { icon: keyof typeof Feather.glyphMap; label: string }) {
  return (
    <View className="flex-row items-center rounded-full bg-white/10 border border-white/20 px-3 py-1.5">
      <Feather name={icon} size={12} color="#fff" style={{ marginRight: 6 }} />
      <Text className="text-white/90 text-xs">{label}</Text>
    </View>
  );
}
function BulletRow({ text }: { text: string }) {
  return (
    <View className="flex-row items-start gap-2 py-1">
      <Text className="text-white/80" style={{ marginTop: 1 }}>•</Text>
      <Text className="text-white/90 flex-1">{text}</Text>
    </View>
  );
}
function ConfidenceBar({ level }: { level: Confidence }) {
  const pct = level === "High" ? 1 : level === "Medium" ? 0.66 : 0.33;
  return (
    <View>
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-white/70 text-xs">Confidence</Text>
        <Text className="text-white/80 text-xs">{level}</Text>
      </View>
      <View className="h-2 rounded-full bg-white/15 overflow-hidden">
        <View style={{ width: `${pct * 100}%` }} className="h-2 bg-white/70" />
      </View>
    </View>
  );
}
