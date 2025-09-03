// app/dashboard.tsx
import React, { memo, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ImageBackground,
  Pressable,
  ScrollView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Slider from "@react-native-community/slider";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { CustomButton } from "../components/UI/CustomButton";

/** ---------------- Mock data & helpers (no backend) ---------------- */

const inspirationalQuotes = [
  "Beautiful hair is a reflection of inner wellness.",
  "Every day is a chance to nourish your hair's potential.",
  "Consistency in care creates lasting beauty.",
  "Your hair journey is unique and beautiful.",
];

const getTimeBasedGreeting = () => "Hello";
const getUserName = () => "there"; // later: wire to profile

const initialRoutine: { step: string; time: string }[] = [
  { step: "Scalp Massage", time: "8:00 AM" },
  { step: "Peptide Serum", time: "8:15 AM" },
  { step: "Nourishing Oil", time: "9:00 PM" },
];

const clamp = (min: number, max: number, v: number) =>
  Math.max(min, Math.min(max, v));
const jitter = (i: number) => Math.sin(i * 1.7) * 1.2;
const contextualTip = (s: number, sh: number, o: number) => {
  if (s <= 3) return "Try a hydrating scalp mask today.";
  if (sh >= 7) return "Gentle combing and stress reduction can help reduce shedding.";
  if (o >= 7) return "Looking great—keep the routine consistent!";
  return "Small, steady care leads to big results.";
};

/** ---------------- Component ---------------- */

export default function Dashboard() {
  const insets = useSafeAreaInsets();

  // Daily check-in values
  const [scalpVal, setScalpVal] = useState(0);
  const [sheddingVal, setSheddingVal] = useState(0);
  const [overallVal, setOverallVal] = useState(0);

  // Routine + completion state (local only)
  const [todayRoutine, setTodayRoutine] = useState(initialRoutine);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  // Lightweight “progress” mock
  const progressStats = { currentStreak: 3, weeklyCompletionRate: 72 };

  useEffect(() => {
    setTodayRoutine(
      [...initialRoutine].sort((a, b) => (a.time || "").localeCompare(b.time || ""))
    );
  }, []);

  const toggleRoutineStep = (stepName: string) => {
    setCompletedSteps((prev) =>
      prev.includes(stepName) ? prev.filter((s) => s !== stepName) : [...prev, stepName]
    );
  };

  return (
    <View className="flex-1 bg-brand-bg">
      {/* Full-bleed background */}
      <ImageBackground
        source={require("../../assets/dashboard.png")}
        resizeMode="cover"
        className="absolute inset-0"
      >

      </ImageBackground>

      {/* Light status icons over hero */}
      <StatusBar style="light" translucent backgroundColor="transparent" />

      {/* Foreground inside safe area (matches onboarding) */}
      <SafeAreaView className="flex-1" edges={["top", "left", "right"]}>
        {/* SCROLLABLE content */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: insets.bottom + 24, // <-- crucial so last card isn't cut off
          }}
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center py-4">
            <Text className="text-white text-2xl font-semibold">
              {getTimeBasedGreeting()}, {getUserName()}
            </Text>
            <Text className="text-white/80">
              Let's nurture your hair health today
            </Text>
          </View>

          {/* Daily Check-in */}
          <GlassCard className="p-5 mb-6">
            <View className="mb-3">
              <Text className="text-white font-semibold">Daily Hair Check-in</Text>
              <Text className="text-[12px] text-white/70">
                Log how you feel today to personalize tips.
              </Text>
            </View>

            <View className="gap-5">
              <CheckinRow
                title="Scalp condition"
                category="scalp"
                value={scalpVal}
                onChange={setScalpVal}
                scaleLabels={["Dry", "Balanced", "Oily"]}
              />
              <CheckinRow
                title="Hair shedding"
                category="shedding"
                value={sheddingVal}
                onChange={setSheddingVal}
                scaleLabels={["Low", "Medium", "High"]}
              />
              <CheckinRow
                title="Overall feeling"
                category="overall"
                value={overallVal}
                onChange={setOverallVal}
                scaleLabels={["Not great", "Okay", "Great"]}
              />
            </View>

            {/* Quick Insights */}
            <View className="mt-6 rounded-xl border border-white/20 bg-white/5 p-4">
              <Text className="text-sm font-semibold text-white mb-2">
                Quick Insights
              </Text>
              <InsightsSummary
                scalpVal={scalpVal}
                sheddingVal={sheddingVal}
                overallVal={overallVal}
              />
            </View>
          </GlassCard>

          {/* Today's Routine */}
          <GlassCard className="p-5 mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <Feather name="calendar" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text className="text-white font-semibold text-lg">Today's Routine</Text>
              </View>

              <View className="px-2 py-1 rounded-full border border-white/30 bg-white/10">
                <Text className="text-white text-[12px]">
                  {completedSteps.length} of {todayRoutine.length} complete
                </Text>
              </View>
            </View>

            <View className="gap-3">
              {todayRoutine.map((item) => {
                const isCompleted = completedSteps.includes(item.step);
                return (
                  <Pressable
                    key={item.step}
                    onPress={() => toggleRoutineStep(item.step)}
                    className={[
                      "flex-row items-center p-4 rounded-lg border",
                      isCompleted
                        ? "bg-white/20 border-white/30"
                        : "bg-white/10 border-white/20 active:bg-white/15",
                    ].join(" ")}
                  >
                    <View
                      className={[
                        "w-6 h-6 rounded-full border items-center justify-center mr-3",
                        isCompleted ? "bg-white/20 border-white/50" : "border-white/40",
                      ].join(" ")}
                    >
                      {isCompleted && <Feather name="check" size={16} color="#fff" />}
                    </View>

                    <View className="flex-1">
                      <Text className="text-white font-semibold">
                        {item.step}
                        {isCompleted && (
                          <Text className="text-white/80 font-normal">  ✓ Complete</Text>
                        )}
                      </Text>
                      <Text className="text-white/70 text-sm">
                        {item.time}
                        {isCompleted && (
                          <Text className="text-white/80">  +5 points earned!</Text>
                        )}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <CustomButton
              variant="ghost"
              className="w-full mt-4 rounded-full"
              onPress={() => router.push("/routine")}
            >
              View Full Routine
            </CustomButton>
          </GlassCard>

          {/* Progress Insights */}
          <GlassCard className="p-5">
            <View className="flex-row items-center mb-4">
              <Feather name="trending-up" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text className="text-white font-semibold text-lg">Your Progress</Text>
            </View>

            <View className="flex-row gap-4">
              <View className="flex-1 items-center p-4 rounded-lg bg-white/10 border border-white/20">
                <Text className="text-white text-2xl font-bold">
                  {progressStats.currentStreak}
                </Text>
                <Text className="text-white/70 text-[12px]">Days streak</Text>
              </View>
              <View className="flex-1 items-center p-4 rounded-lg bg-white/10 border border-white/20">
                <Text className="text-white text-2xl font-bold">
                  {progressStats.weeklyCompletionRate}%
                </Text>
                <Text className="text-white/70 text-[12px]">Weekly completion</Text>
              </View>
            </View>
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/** ---------------- Subcomponents ---------------- */

function GlassCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={["rounded-2xl overflow-hidden border border-white/20", className].join(" ")}>
      <BlurView intensity={20} tint="light" className="absolute inset-0" />
      <View className="relative">{children}</View>
    </View>
  );
}

const CheckinRow = memo(function CheckinRow({
  title,
  category,
  value,
  onChange,
  scaleLabels,
}: {
  title: string;
  category: "scalp" | "shedding" | "overall";
  value: number;
  onChange: (v: number) => void;
  scaleLabels: [string, string, string];
}) {
  const getLabel = (c: "scalp" | "shedding" | "overall", v: number) => {
    if (c === "scalp") return v <= 3 ? "Dry" : v <= 6 ? "Balanced" : "Oily";
    if (c === "shedding") return v <= 3 ? "Low" : v <= 6 ? "Medium" : "High";
    return v <= 3 ? "Not great" : v <= 6 ? "Okay" : "Great";
  };

  return (
    <View>
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-sm text-white/80">{title}</Text>
        <Text className="text-[12px] text-white/80">{getLabel(category, value)}</Text>
      </View>

      <Slider
        value={value}
        minimumValue={0}
        maximumValue={10}
        step={0.1}
        minimumTrackTintColor="#ffffff"
        maximumTrackTintColor="rgba(255,255,255,0.25)"
        thumbTintColor="#ffffff"
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : (v as number))}
      />

      <View className="flex-row justify-between mt-1">
        <Text className="text-[10px] text-white/60">{scaleLabels[0]}</Text>
        <Text className="text-[10px] text-white/60">{scaleLabels[1]}</Text>
        <Text className="text-[10px] text-white/60">{scaleLabels[2]}</Text>
      </View>
    </View>
  );
});

function InsightsSummary({
  scalpVal,
  sheddingVal,
  overallVal,
}: {
  scalpVal: number;
  sheddingVal: number;
  overallVal: number;
}) {
  // local mock "last 7 days"
  const last7 = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, i) => ({
        scalp: clamp(0, 10, scalpVal + jitter(i)),
        shedding: clamp(0, 10, sheddingVal + jitter(i + 2)),
        overall: clamp(0, 10, overallVal + jitter(i + 4)),
      })),
    [scalpVal, sheddingVal, overallVal]
  );

  const avg = (arr: number[]) =>
    arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : 0;

  const avgScalp = avg(last7.map((d) => d.scalp));
  const avgShed = avg(last7.map((d) => d.shedding));
  const avgOverall = avg(last7.map((d) => d.overall));

  const label = (c: "scalp" | "shedding" | "overall", v: number) => {
    if (c === "scalp") return v <= 3 ? "Dry" : v <= 6 ? "Balanced" : "Oily";
    if (c === "shedding") return v <= 3 ? "Low" : v <= 6 ? "Medium" : "High";
    return v <= 3 ? "Not great" : v <= 6 ? "Okay" : "Great";
  };

  return (
    <View>
      <View className="flex-row gap-2">
        <SummaryChip label="Scalp" now={label("scalp", scalpVal)} avg={label("scalp", avgScalp)} />
        <SummaryChip
          label="Shedding"
          now={label("shedding", sheddingVal)}
          avg={label("shedding", avgShed)}
        />
        <SummaryChip
          label="Overall"
          now={label("overall", overallVal)}
          avg={label("overall", avgOverall)}
        />
      </View>

      <View className="mt-3 flex-row items-start gap-3 rounded-lg bg-white/10 border border-white/20 p-3">
        <View className="mt-0.5 p-1.5 rounded-full bg-white/20">
          <Feather name="sun" size={14} color="#fff" />
        </View>
        <Text className="text-white/90 text-sm leading-snug">
          {contextualTip(scalpVal, sheddingVal, overallVal)}
        </Text>
      </View>
    </View>
  );
}

function SummaryChip({ label, now, avg }: { label: string; now: string; avg: string }) {
  return (
    <View className="flex-1 items-center rounded-lg bg-white/10 border border-white/20 p-2">
      <Text className="text-[10px] text-white/70">{label}</Text>
      <Text className="text-sm text-white">{now}</Text>
      <Text className="text-[10px] text-white/60">7d: {avg}</Text>
    </View>
  );
}
