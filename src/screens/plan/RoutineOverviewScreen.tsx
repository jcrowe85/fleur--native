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
import { usePlanStore } from "@/state/planStore";
import type { RoutineIcon } from "@/types/plan";

/* -------------------------------------------------------------
   Shape adapter: make UI resilient to old/new routine shapes
------------------------------------------------------------- */
type RoutineCoerced = {
  overview: { title: string; paragraph: string };
  weeklyPillars: Array<{ text: string; icon?: RoutineIcon | "none" }>;
  why: string[];
  notes?: string[];
};

function coerceRoutine(raw: any): RoutineCoerced | null {
  if (!raw) return null;

  // New shape (server schema)
  if (raw.overview?.title && raw.overview?.paragraph && Array.isArray(raw.weeklyPillars)) {
    const pillars = raw.weeklyPillars
      .map((p: any) =>
        typeof p === "string"
          ? { text: p }
          : { text: String(p?.text ?? ""), icon: (p?.icon as RoutineIcon | "none" | undefined) }
      )
      .filter((p) => p.text);
    const why = Array.isArray(raw.why) ? raw.why.map(String) : [];
    const notes = Array.isArray(raw.notes) ? raw.notes.map(String) : undefined;
    return {
      overview: { title: String(raw.overview.title), paragraph: String(raw.overview.paragraph) },
      weeklyPillars: pillars,
      why,
      notes,
    };
  }

  // Old demo shape (headline/subhead + string[] pillars)
  if (raw.headline || raw.subhead || Array.isArray(raw.weeklyPillars) || Array.isArray(raw.why)) {
    const title = raw.headline ? String(raw.headline) : "Your Routine";
    const paragraph = raw.subhead ? String(raw.subhead) : "";
    const pillars = Array.isArray(raw.weeklyPillars)
      ? raw.weeklyPillars
          .map((p: any) => (typeof p === "string" ? { text: p } : { text: String(p?.text ?? "") }))
          .filter((p) => p.text)
      : [];
    const why = Array.isArray(raw.why) ? raw.why.map(String) : [];
    return { overview: { title, paragraph }, weeklyPillars: pillars, why };
  }

  return null;
}

/* -------------------------------------------------------------
   Heuristic icon fallback if LLM didn't provide one
------------------------------------------------------------- */
function pickIcon(text: string): RoutineIcon {
  const s = text.toLowerCase();
  if (s.includes("cleanse") || s.includes("wash") || s.includes("shampoo")) return "droplet";
  if (s.includes("massage") || s.includes("scalp")) return "heart";
  if (s.includes("heat") || s.includes("protectant")) return "zap";
  if (s.includes("leave-in") || s.includes("hydration") || s.includes("condition")) return "feather";
  if (s.includes("night") || s.includes("pm")) return "moon";
  if (s.includes("bond")) return "shield";
  if (s.includes("list") || s.includes("weekly")) return "list";
  if (s.includes("info") || s.includes("why")) return "info";
  return "star";
}

/* -------------------------------------------------------------
   Screen
------------------------------------------------------------- */
export default function RoutineOverview() {
  const insets = useSafeAreaInsets();
  const plan = usePlanStore((s) => s.plan);
  const routine = React.useMemo(() => coerceRoutine(plan?.routine), [plan]);

  return (
    <View className="flex-1 bg-brand-bg">
      <StatusBar style="light" translucent backgroundColor="transparent" />
      {/* Background */}
      <ImageBackground
        source={require("../../../assets/dashboard.png")}
        resizeMode="cover"
        className="absolute inset-0"
      >
      </ImageBackground>

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

          {/* Loading / empty guard */}
          {!routine ? (
            <GlassCard className="p-5 mb-6">
              <SectionHeader icon="info" title="Preparing your routine…" />
              <Text className="text-white/80">
                We couldn’t load your routine yet. Please go back to Summary and try again.
              </Text>
              <Pressable
                onPress={() => router.replace("/(plan)/summary")}
                className="mt-4 w-full rounded-full bg-white items-center py-3 active:opacity-90"
              >
                <Text className="text-brand-bg font-semibold">Back to Summary</Text>
              </Pressable>
            </GlassCard>
          ) : (
            <>
              {/* Overview card */}
              <GlassCard className="p-5 mb-6">
                <SectionHeader icon="bookmark" title={routine.overview.title} />
                <Text className="text-white/90 leading-snug">{routine.overview.paragraph}</Text>
              </GlassCard>

              {/* Weekly pillars with icons */}
              {routine.weeklyPillars.length > 0 && (
                <GlassCard className="p-5 mb-6">
                  <SectionHeader icon="list" title="Weekly outline" />
                  <View className="mt-1">
                    {routine.weeklyPillars.map((p, i) => {
                      // Accept 'none' sentinel from schema; otherwise use model/fallback icon
                      const rawIcon = (p as any).icon as RoutineIcon | "none" | undefined;
                      const icon =
                        rawIcon && rawIcon !== "none" ? (rawIcon as keyof typeof Feather.glyphMap) : pickIcon(p.text);
                      // If pickIcon returns something, show it; else show bullet
                      return <BulletRow key={i} text={p.text} icon={icon} />;
                    })}
                  </View>
                </GlassCard>
              )}

              {/* Why this works */}
              {routine.why.length > 0 && (
                <GlassCard className="p-5 mb-6">
                  <SectionHeader icon="info" title="Why this works" />
                  <View className="mt-1">
                    {routine.why.map((t, i) => (
                      <BulletRow key={i} text={t} />
                    ))}
                  </View>
                </GlassCard>
              )}

              {/* Notes (optional) */}
              {!!routine.notes?.length && (
                <GlassCard className="p-5 mb-6">
                  <SectionHeader icon="star" title="Notes" />
                  <View className="mt-1">
                    {routine.notes!.map((t, i) => (
                      <BulletRow key={i} text={t} />
                    ))}
                  </View>
                </GlassCard>
              )}

              {/* CTA → Recommendations */}
              <Pressable
                onPress={() => router.push("/recommendations")}
                className="w-full rounded-full bg-white items-center py-3 active:opacity-90"
              >
                <Text className="text-brand-bg font-semibold">View Recommendations</Text>
              </Pressable>
            </>
          )}
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

function BulletRow({ text, icon }: { text: string; icon?: keyof typeof Feather.glyphMap }) {
  return (
    <View className="flex-row items-start gap-2 py-1">
      {icon ? (
        <Feather name={icon} size={14} color="#fff" style={{ marginTop: 2 }} />
      ) : (
        <Text className="text-white/80" style={{ marginTop: 1 }}>
          •
        </Text>
      )}
      <Text className="text-white/90 flex-1">{text}</Text>
    </View>
  );
}

/* -------------------------------------------------------------
   RecoveryChart – compact, static overview version (unchanged)
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
        <Path
          d={`M${pad},${height - pad} L${width - pad},${height - pad}`}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={1}
        />

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
