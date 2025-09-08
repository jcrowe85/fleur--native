// app/summary.tsx
import React from "react";
import { View, Text, ImageBackground, ScrollView, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

/* ------------------------------------------------------------------ */
/* Types for answers (align with your form state)                      */
/* ------------------------------------------------------------------ */
type HairConcern =
  | "Thinning at crown / temples"
  | "Excess shedding"
  | "Breakage / dryness"
  | "lack of volume/thickness"
  | "Scalp irritation or flaking"
  | "Other";

type CurrentFactors =
  | "Post-partum changes"
  | "Menopause / Perimenopause"
  | "Recent illness or stress"
  | "Major diet / lifestyle change"
  | "None of the above";

type PostpartumWindow = "0-3 months" | "3-6 months" | "6-12 months" | "over a year ago";
type MenopauseStage = "Perimenopause" | "Menopause" | "Post-menopause";
type HairType = "Straight" | "Wavy" | "Curly" | "Coily";
type Texture = "Fine" | "Medium" | "Course";
type ScalpType = "Oily" | "Dry" | "Sensitive" | "Balanced / Normal";
type WashCadence = "Daily" | "Every 2-3 days" | "Twice a week" | "Once a week or less";
type MainGoal =
  | "Regrow / thicken"
  | "Reduce shedding"
  | "Improve scalp health"
  | "Strengthen strands"
  | "Add shine & softness"
  | "Support long-term wellness";
type ColorTreat = "Yes, regularly" | "Yes, occasionally" | "No";
type HeatUse = "Yes, daily" | "Yes, a few times per week" | "Rarely" | "Never";
type Supps =
  | "Yes, daily supplements"
  | "Yes, prescriptions (e.g. minoxidil, finasteride)"
  | "No, not currently";

type Answers = {
  q1_concerns: HairConcern[];
  q2_currentFactors: CurrentFactors[];
  q2a_postpartum?: PostpartumWindow;
  q2b_menopause?: MenopauseStage;
  q3_type: HairType;
  q4_texture: Texture;
  q5_scalp: ScalpType;
  q6_wash: WashCadence;
  q7_goal: MainGoal;
  q8_color: ColorTreat;
  q9_heat: HeatUse;
  q10_treatments: Supps;
};

/* ------------------------------------------------------------------ */
/* Mapping engine: answers -> summary model                            */
/* ------------------------------------------------------------------ */
type SummaryModel = {
  primaryInsight: {
    title: string;
    details: string;
    confidence: "Low" | "Medium" | "High";
  };
  drivers: { icon: keyof typeof Feather.glyphMap; label: string }[];
  quickWins: string[];
  flags: string[]; // Risk flags (Heads up)
};

const has = <T,>(arr: T[] | undefined, v: T) => !!arr?.includes(v);

function confidenceFromSignals(signals: number): SummaryModel["primaryInsight"]["confidence"] {
  if (signals >= 4) return "High";
  if (signals >= 2) return "Medium";
  return "Low";
}

function buildSummaryFromAnswers(a: Answers): SummaryModel {
  // Drivers / context
  const isPP = has(a.q2_currentFactors, "Post-partum changes");
  const isMeno = has(a.q2_currentFactors, "Menopause / Perimenopause");
  const isStress = has(a.q2_currentFactors, "Recent illness or stress");
  const isDiet = has(a.q2_currentFactors, "Major diet / lifestyle change");
  const concerns = a.q1_concerns;
  const main = a.q7_goal;

  // Confidence signals
  let signals = 0;
  if (isPP || isMeno) signals++;
  if (has(concerns, "Excess shedding") || has(concerns, "Thinning at crown / temples")) signals++;
  if (a.q4_texture === "Fine" || a.q5_scalp === "Sensitive") signals++;
  if (a.q9_heat === "Yes, daily" || a.q9_heat === "Yes, a few times per week") signals++;

  // Primary insight
  let title = "";
  let details = "";
  if (isPP) {
    const window = a.q2a_postpartum ? ` (${a.q2a_postpartum})` : "";
    title = `Temporary postpartum shedding${window}`;
    details =
      "This is common and manageable. Nourishment + gentle scalp support typically help within 6–8 weeks.";
  } else if (isMeno) {
    const stage = a.q2b_menopause ? ` (${a.q2b_menopause})` : "";
    title = `Hormone-related thinning & texture changes${stage}`;
    details =
      "Hydration-forward care, scalp comfort, and heat moderation usually improve fullness signals by 6–8 weeks.";
  } else if (has(concerns, "Excess shedding")) {
    title = "Active shedding phase";
    details =
      "We’ll work to normalize shed rate with calm scalp care, steady nourishment, and gentle styling habits.";
  } else if (has(concerns, "Thinning at crown / temples")) {
    title = "Early density and volume support";
    details =
      "Targeted scalp care and protection from heat/processing can help lift and strength in 4–8 weeks.";
  } else if (has(concerns, "Breakage / dryness")) {
    title = "Strand fragility & moisture repair";
    details =
      "Hydration-forward wash days + leave-in protection reduce breakage and restore softness.";
  } else if (has(concerns, "Scalp irritation or flaking")) {
    title = "Scalp barrier support";
    details =
      "Gentle surfactants and calming actives often reduce reactivity while keeping comfort steady.";
  } else {
    title = main === "Support long-term wellness" ? "Long-term hair wellness plan" : `Focused on: ${main}`;
    details = "We’ll anchor your routine around steady care tailored to your scalp, texture, and styling.";
  }
  const confidence = confidenceFromSignals(signals);

  // Drivers (max 3)
  const drivers: SummaryModel["drivers"] = [];
  if (isPP && drivers.length < 3) drivers.push({ icon: "heart", label: "Post-partum window" });
  if (isMeno && drivers.length < 3) drivers.push({ icon: "moon", label: "Menopause transition" });
  if (isStress && drivers.length < 3) drivers.push({ icon: "activity", label: "Stress/illness" });
  if (isDiet && drivers.length < 3) drivers.push({ icon: "coffee", label: "Diet/lifestyle shift" });
  if ((a.q9_heat === "Yes, daily" || a.q9_heat === "Yes, a few times per week") && drivers.length < 3)
    drivers.push({ icon: "zap", label: "Frequent heat" });
  if ((a.q8_color === "Yes, regularly" || a.q8_color === "Yes, occasionally") && drivers.length < 3)
    drivers.push({ icon: "droplet", label: "Processing stress" });
  if (a.q4_texture === "Fine" && drivers.length < 3) drivers.push({ icon: "feather", label: "Fine texture" });
  if (a.q5_scalp !== "Balanced / Normal" && drivers.length < 3)
    drivers.push({ icon: "thermometer", label: `${a.q5_scalp} scalp` });

  // Quick wins (2–4)
  const quickWins: string[] = [];
  if (isPP || has(concerns, "Excess shedding") || main === "Reduce shedding" || main === "Regrow / thicken")
    quickWins.push("Scalp massage 3 min, 4×/wk (PM)");
  if (a.q9_heat === "Yes, daily" || a.q9_heat === "Yes, a few times per week")
    quickWins.push("Heat protectant every style; medium heat only");
  if (has(concerns, "Breakage / dryness") || main === "Add shine & softness")
    quickWins.push("Conditioner dwell 3–5 min; leave-in on mid-lengths/ends");
  if (a.q6_wash === "Daily") quickWins.push("Space washing to 2–3×/wk with gentle cleanser");
  if (a.q6_wash === "Once a week or less" && quickWins.length < 4) quickWins.push("Light scalp rinse on off-days");
  if ((a.q8_color === "Yes, regularly" || a.q8_color === "Yes, occasionally") && quickWins.length < 4)
    quickWins.push("Bond-building mask 1×/wk");

  // Risk flags (Heads up) — expanded examples
  const flags: string[] = [];
  // Sensitive scalp + irritation concern
  if (has(concerns, "Scalp irritation or flaking") && a.q5_scalp === "Sensitive")
    flags.push("Patch test new actives; avoid harsh surfactants and heavy fragrance.");
  // Excess shedding with no obvious factor selected
  if (has(concerns, "Excess shedding") && has(a.q2_currentFactors, "None of the above"))
    flags.push("If heavy shedding persists >12 weeks, consider a clinician check-in.");
  // Daily heat
  if (a.q9_heat === "Yes, daily")
    flags.push("Daily heat is a high stressor—aim to drop to 2–3×/wk and use protectant.");
  // Color/chem + dryness
  if ((a.q8_color === "Yes, regularly" || a.q8_color === "Yes, occasionally") && has(concerns, "Breakage / dryness"))
    flags.push("Color/chemical processing + dryness: prioritize bond care and lower heat.");
  // Very infrequent washing + oily scalp
  if (a.q6_wash === "Once a week or less" && a.q5_scalp === "Oily")
    flags.push("Infrequent washing + oily scalp can clog—add a light scalp refresh on off-days.");
  // Coily + fine (tangle risk)
  if (a.q3_type === "Coily" && a.q4_texture === "Fine")
    flags.push("Fine coily hair tangles easily—detangle with slip, low tension, and wide-tooth tools.");

  return {
    primaryInsight: { title, details, confidence },
    drivers,
    quickWins: quickWins.slice(0, 4),
    flags,
  };
}

/* ------------------------------------------------------------------ */
/* Demo data: swap with your real answers                              */
/* ------------------------------------------------------------------ */
const MOCK_ANSWERS: Answers = {
  q1_concerns: ["Excess shedding", "Breakage / dryness"],
  q2_currentFactors: ["Post-partum changes"],
  q2a_postpartum: "3-6 months",
  q2b_menopause: undefined,
  q3_type: "Wavy",
  q4_texture: "Fine",
  q5_scalp: "Sensitive",
  q6_wash: "Every 2-3 days",
  q7_goal: "Regrow / thicken",
  q8_color: "Yes, occasionally",
  q9_heat: "Yes, a few times per week",
  q10_treatments: "Yes, daily supplements",
};

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */
export default function Summary() {
  const insets = useSafeAreaInsets();
  const model = React.useMemo(() => buildSummaryFromAnswers(MOCK_ANSWERS), []);

  return (
    <View className="flex-1 bg-brand-bg">
      {/* Background */}
      <ImageBackground
        source={require("../../../assets/dashboard.png")}
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

      <SafeAreaView className="flex-1" edges={["top", "left", "right"]}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: insets.bottom + 28,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="flex-row items-center justify-center mb-6" style={{ paddingTop: 8 }}>
            {/* <Pressable
              onPress={() => router.back()}
              className="absolute left-0 p-2 rounded-full active:opacity-80"
              hitSlop={8}
            >
              <Feather name="arrow-left" size={22} color="#fff" />
            </Pressable> */}
            <View>
              <Text className="text-white text-[22px] font-semibold text-center">
                Your Hair Summary
              </Text>
              <Text className="text-white/80 text-sm text-center mt-1">
                What we found and how we’ll help over the next 6–8 weeks
              </Text>
            </View>
          </View>

          {/* Primary insight */}
          <GlassCard className="p-5 mb-6">
            <SectionHeader icon="bookmark" title={model.primaryInsight.title} />
            <Text className="text-white/90 leading-snug mb-3">{model.primaryInsight.details}</Text>
            <ConfidenceBar level={model.primaryInsight.confidence} />
          </GlassCard>

          {/* Drivers */}
          <GlassCard className="p-5 mb-6">
            <SectionHeader icon="map-pin" title="What’s driving this" />
            <View className="flex-row flex-wrap -mx-1">
              {model.drivers.length > 0 ? (
                model.drivers.map((d, i) => (
                  <View key={i} className="px-1 py-1">
                    <Chip icon={d.icon} label={d.label} />
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
              {model.quickWins.map((q, i) => (
                <BulletRow key={i} text={q} />
              ))}
            </View>
          </GlassCard>

          {/* Heads up (Risk flags) */}
          {model.flags.length > 0 && (
            <GlassCard className="p-5 mb-6">
              <SectionHeader icon="alert-triangle" title="Heads up" />
              <View className="gap-2">
                {model.flags.map((f, i) => (
                  <Text key={i} className="text-white/85 text-sm leading-snug">
                    • {f}
                  </Text>
                ))}
              </View>
            </GlassCard>
          )}

            {/* Single CTA → Routine page */}
            <Pressable
                onPress={() => router.push("/routine-overview")}
                className="w-full rounded-full bg-white items-center py-3 active:opacity-90"
                >
                <Text className="text-brand-bg font-semibold">View Routine</Text>
            </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* UI bits                                                             */
/* ------------------------------------------------------------------ */
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
      <Text className="text-white/80" style={{ marginTop: 1 }}>
        •
      </Text>
      <Text className="text-white/90 flex-1">{text}</Text>
    </View>
  );
}

function ConfidenceBar({ level }: { level: "Low" | "Medium" | "High" }) {
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
