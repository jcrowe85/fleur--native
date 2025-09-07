// app/routine.tsx
import React from "react";
import { View, Text, ImageBackground, ScrollView, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Svg, Path, Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from "react-native-svg";

/* -------------------------------------------------------------
   Menopause profile – concise overview content
------------------------------------------------------------- */
type RoutineOverviewModel = {
  headline: string;
  subhead: string;
  weeklyPillars: string[];
  progressCopy: string[];
  why: string[];
};

// Hard-coded for the target persona (Menopause + thinning/hair loss)
function buildMenopauseOverview(): RoutineOverviewModel {
  return {
    headline: "Menopause: Thinning & Hair Loss",
    subhead:
      "Focus on scalp comfort, consistent stimulation, and protective styling. Expect early fullness signals with steady habits over 6–8 weeks.",
    weeklyPillars: [
      "Cleanse 2×/week; add hydration on off-days",
      "Nightly scalp support (peptide serum) + gentle 3-min massage",
      "Always use heat protectant; medium heat only",
      "Leave-in hydration on styling days; low-tension styles",
    ],
    progressCopy: [
      "Getting started",
      "Consistency taking hold",
      "Scalp feel improving",
      "Visible progress",
    ],
    why: [
      "Hormone shifts affect density and texture; steady scalp support helps normalize signals.",
      "Protection + hydration reduce daily strand stress and breakage.",
      "Small, repeatable actions compound faster than occasional overhauls.",
    ],
  };
}

/* -------------------------------------------------------------
   Screen
------------------------------------------------------------- */
export default function RoutineOverview() {
  const insets = useSafeAreaInsets();
  const model = React.useMemo(buildMenopauseOverview, []);

  return (
    <View className="flex-1 bg-brand-bg">
      {/* Background */}
      <ImageBackground
        source={require("../../assets/dashboard.png")}
        resizeMode="cover"
        className="absolute inset-0"
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.10)", "rgba(0,0,0,0.35)", "rgba(0,0,0,0.70)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          className="absolute inset-0"
        />
      </ImageBackground>

      <StatusBar style="light" translucent backgroundColor="transparent" />

      <SafeAreaView className="flex-1" edges={["top", "left", "right"]}>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: insets.bottom + 28,
          }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-center mb-6" style={{ paddingTop: 8 }}>
            <Pressable
              onPress={() => router.back()}
              className="absolute left-0 p-2 rounded-full active:opacity-80"
              hitSlop={8}
            >
              <Feather name="arrow-left" size={22} color="#fff" />
            </Pressable>
            <View>
              <Text className="text-white text-[22px] font-semibold text-center">
                Your Routine Overview
              </Text>
              <Text className="text-white/80 text-sm text-center mt-1">
                High-level plan for the next few weeks
              </Text>
            </View>
          </View>

          {/* Focus card */}
          <GlassCard className="p-5 mb-6">
            <SectionHeader icon="bookmark" title={model.headline} />
            <Text className="text-white/90 leading-snug">{model.subhead}</Text>
          </GlassCard>

          {/* Weekly pillars */}
          <GlassCard className="p-5 mb-6">
            <SectionHeader icon="list" title="Weekly outline" />
            <View className="mt-1">
              {model.weeklyPillars.map((p, i) => (
                <BulletRow key={i} text={p} />
              ))}
            </View>
          </GlassCard>

          {/* Progress tracker (compact, static midpoint marker) */}
          {/* <GlassCard className="p-4 mb-6">
            <SectionHeader icon="trending-up" title="Progress tracker" />
            <View className="items-center">
              <RecoveryChart
                weeks={16}
                curve={{ startSlope: 0.08, accel: 0.22, plateauAt: 0.82 }}
                captions={model.progressCopy}
              />
            </View>
          </GlassCard> */}

          {/* Why this works */}
          <GlassCard className="p-5 mb-6">
            <SectionHeader icon="info" title="Why this works" />
            <View className="mt-1">
              {model.why.map((t, i) => (
                <BulletRow key={i} text={t} />
              ))}
            </View>
          </GlassCard>

          {/* Single CTA → Recommendations */}
          <Pressable
            onPress={() => router.push("/recommendations")}
            className="w-full rounded-full bg-white items-center py-3 active:opacity-90"
          >
            <Text className="text-brand-bg font-semibold">View Recommendations</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/* -------------------------------------------------------------
   UI bits
------------------------------------------------------------- */
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
    <View className="flex-row items-center mb-3">
      <Feather name={icon} size={18} color="#fff" style={{ marginRight: 8 }} />
      <Text className="text-white font-semibold">{title}</Text>
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

/* -------------------------------------------------------------
   RecoveryChart – compact, static overview version
------------------------------------------------------------- */
function RecoveryChart({
  weeks,
  curve,
  captions = ["Getting started", "Consistency taking hold", "Scalp feel improving", "Visible progress"],
}: {
  weeks: number;
  curve: { startSlope: number; accel: number; plateauAt: number };
  captions?: string[];
}) {
  const width = 340;
  const height = 140;
  const pad = 12;

  const pts = React.useMemo(() => {
    const out: { x: number; y: number }[] = [];
    for (let i = 0; i <= weeks; i++) {
      const t = i / weeks;
      const y = curve.plateauAt * (1 / (1 + Math.exp(-(t * 8 - 4))));
      out.push({ x: t, y });
    }
    return out;
  }, [weeks, curve.plateauAt]);

  const px = (t: number) => pad + t * (width - pad * 2);
  const py = (y: number) => height - pad - y * (height - pad * 2);

  const pathLine = React.useMemo(
    () => pts.map((p, i) => `${i === 0 ? "M" : "L"}${px(p.x)},${py(p.y)}`).join(" "),
    [pts]
  );
  const pathArea = React.useMemo(
    () => `${pathLine} L${width - pad},${height - pad} L${pad},${height - pad} Z`,
    [pathLine]
  );

  // Midpoint marker (week 6) for overview
  const midWeek = Math.min(6, weeks);
  const midX = px(midWeek / weeks);
  const midY = py(pts[midWeek].y);

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={width} height={height}>
        <Defs>
          <SvgLinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="white" stopOpacity={0.2} />
            <Stop offset="1" stopColor="white" stopOpacity={0.02} />
          </SvgLinearGradient>
          <SvgLinearGradient id="stroke" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="white" stopOpacity={0.95} />
            <Stop offset="1" stopColor="white" stopOpacity={0.5} />
          </SvgLinearGradient>
        </Defs>

        {/* baseline */}
        <Path d={`M${pad},${height - pad} L${width - pad},${height - pad}`} stroke="rgba(255,255,255,0.18)" strokeWidth={1} />

        {/* area & line */}
        <Path d={pathArea} fill="url(#area)" />
        <Path d={pathLine} stroke="url(#stroke)" strokeWidth={2} fill="none" />

        {/* midpoint marker */}
        <Circle cx={midX} cy={midY} r={8} fill="rgba(255,255,255,0.18)" />
        <Circle cx={midX} cy={midY} r={4} fill="#fff" />
      </Svg>

      {/* static caption */}
      <View style={{ position: "absolute", top: 8, width: 220, left: (340 - 220) / 2 }}>
        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600", textAlign: "center" }}>
          {captions[1] ?? "Consistency taking hold"}
        </Text>
      </View>

      {/* axis */}
      <View className="mt-2 flex-row justify-between w-[340px]">
        <Text className="text-white/70 text-[10px]">Week 0</Text>
        <Text className="text-white/70 text-[10px]">Week {weeks}</Text>
      </View>
    </View>
  );
}
