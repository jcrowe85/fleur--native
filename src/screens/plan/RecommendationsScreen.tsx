// app/recommendations.tsx
import React from "react";
import { View, Text, ImageBackground, ScrollView, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

/* -------------------------------------------------------------
   Content for Menopause + Thinning/Hair Loss persona
------------------------------------------------------------- */
type RecCard = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  problem: string;
  solution: string;
  routineFit: string;  // where it fits (AM/PM/Weekly)
  why: string;         // value rationale
  ctaLabel: string;
  onPress?: () => void; // wire to cart or detail later
};

const RECS: RecCard[] = [
  {
    icon: "package",
    title: "Daily Hair Supplement",
    problem: "Mineral & nutrient gaps may amplify shedding during menopause.",
    solution: "A daily formula targeted for hair density and root health.",
    routineFit: "AM — with food",
    why: "Consistent micronutrient support helps normalize hair growth signals over time.",
    ctaLabel: "Add Supplement",
  },
  {
    icon: "droplet",
    title: "Peptide Scalp Serum",
    problem: "Thinning at crown/part line needs direct follicle support.",
    solution: "Lightweight peptide complex to support fuller-looking density.",
    routineFit: "PM — nightly + 3-min gentle massage",
    why: "Topical consistency + micro-stimulation are key drivers of visible fullness signals.",
    ctaLabel: "Add Serum",
  },
  {
    icon: "wind",
    title: "Gentle Cleanse + Nourish",
    problem: "Dryness & scalp discomfort can derail consistency.",
    solution: "Low-harshness shampoo + hydrating conditioner for barrier comfort.",
    routineFit: "Wash 2×/week; hydration on off-days",
    why: "Comfort-first cleansing helps you keep the routine steady, which compounds results.",
    ctaLabel: "Add Wash Duo",
  },
];

/* -------------------------------------------------------------
   Screen
------------------------------------------------------------- */
export default function Recommendations() {
  const insets = useSafeAreaInsets();

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
                Your Recommendations
              </Text>
              <Text className="text-white/80 text-sm text-center mt-1">
                Problem → Solution, matched to your routine
              </Text>
            </View>
          </View>

          {/* Cards */}
          <View className="gap-4 mb-6">
            {RECS.map((r, i) => (
              <GlassCard key={i} className="p-5">
                <View className="flex-row items-center mb-3">
                  <View className="p-1.5 rounded-full bg-white/15 mr-2">
                    <Feather name={r.icon} size={16} color="#fff" />
                  </View>
                  <Text className="text-white font-semibold">{r.title}</Text>
                </View>

                <InfoRow label="Problem" text={r.problem} />
                <InfoRow label="Solution" text={r.solution} />
                <InfoRow label="Fits your routine" text={r.routineFit} />
                <InfoRow label="Why this" text={r.why} />

                <Pressable
                  onPress={r.onPress ?? (() => router.push("/cart"))}
                  className="mt-3 w-full rounded-full bg-white items-center py-3 active:opacity-90"
                >
                  <Text className="text-brand-bg font-semibold">{r.ctaLabel}</Text>
                </Pressable>
              </GlassCard>
            ))}
          </View>

          {/* Secondary CTA row */}
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => router.replace("/cart")}
              className="flex-1 rounded-full bg-white items-center py-3 active:opacity-90"
            >
              <Text className="text-brand-bg font-semibold">Review Cart</Text>
            </Pressable>
            <Pressable
              onPress={() => router.replace("/routine")}
              className="flex-1 rounded-full border border-white/40 bg-white/10 items-center py-3 active:opacity-90"
            >
              <Text className="text-white font-semibold">Back to Routine</Text>
            </Pressable>
          </View>
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

function InfoRow({ label, text }: { label: string; text: string }) {
  return (
    <View className="mb-2">
      <Text className="text-white/70 text-[11px] uppercase tracking-wide">{label}</Text>
      <Text className="text-white/90">{text}</Text>
    </View>
  );
}
