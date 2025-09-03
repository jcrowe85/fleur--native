// app/onboarding.tsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  ImageBackground,
  Pressable,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { CustomButton } from "../components/UI/CustomButton"; // adjust if your path differs

const STEPS = [
  {
    title: "What's your main hair concern?",
    options: [
      "Hair thinning/loss",
      "Dry/damaged hair",
      "Scalp sensitivity",
      "Lack of growth",
      "General maintenance",
    ],
  },
  {
    title: "How often do you wash your hair?",
    options: ["Daily", "2-3 times per week", "Once a week", "Less than once a week"],
  },
  {
    title: "What's your hair type?",
    options: ["Fine/thin", "Normal thickness", "Thick/coarse", "Curly/textured", "Not sure"],
  },
  {
    title: "What are your hair goals?",
    options: [
      "Stronger, healthier hair",
      "Increased thickness",
      "Better scalp health",
      "Longer hair",
      "Overall hair wellness",
    ],
  },
] as const;

const GOALS_STEP_INDEX = (() => {
  const i = STEPS.findIndex(
    s => s.title.trim().toLowerCase() === "what are your hair goals?"
  );
  return i >= 0 ? i : STEPS.length - 1; // fallback to last step
})();

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[][]>(STEPS.map(() => []));
  const total = STEPS.length;

  // Animated progress (0–100)
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pct = useMemo(() => ((step + 1) / total) * 100, [step, total]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: pct,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // animating width (%)
    }).start();
  }, [pct, progressAnim]);

  const toggle = (value: string) => {
    setAnswers((prev) => {
      const next = prev.map((arr) => [...arr]);
      const set = new Set(next[step]);
      set.has(value) ? set.delete(value) : set.add(value);
      next[step] = Array.from(set);
      return next;
    });
  };

  const goNext = () => {
    const atGoalsStep = step === GOALS_STEP_INDEX;
  
    if (atGoalsStep) {
      // no auth / storage yet — just take them to the dashboard
      // use 'replace' so back button doesn't return to onboarding
      router.replace("/dashboard");
      return;
    }
  
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => {
    if (step > 0) setStep((s) => s - 1);
    else router.back();
  };

  const current = STEPS[step];
  const selected = answers[step];
  const disabled = selected.length === 0;

  return (
    <View className="flex-1 bg-brand-bg">
      {/* Full-bleed background */}
      {/* If your assets folder is at project root, from app/ use "../assets/..." */}
      <ImageBackground
        source={require("../../assets/dashboard.png")}
        resizeMode="cover"
        className="absolute inset-0"
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.25)", "rgba(0,0,0,0.15)", "rgba(0,0,0,0.35)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          className="absolute inset-0"
        />
      </ImageBackground>

      {/* Light status icons over hero */}
      <StatusBar style="light" translucent backgroundColor="transparent" />

      {/* Foreground inside safe area (prevents notch overlap) */}
      <SafeAreaView className="flex-1 px-6 pt-2" edges={["top", "left", "right"]}>
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <Pressable onPress={goBack} className="p-2 rounded-full active:opacity-80" hitSlop={8}>
            <Feather name="arrow-left" size={24} color="#fff" />
          </Pressable>

          <Text className="text-white/80 text-sm">
            Step {step + 1} of {total}
          </Text>

          <View className="w-8" />
        </View>

        {/* Progress (thin track with white fill) */}
        <View className="mb-8">
          <View className="h-2 bg-white/20 rounded-full overflow-hidden">
            <Animated.View
              className="h-full bg-white"
              style={{
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ["0%", "100%"],
                }),
              }}
            />
          </View>
        </View>

        {/* Question + subtext */}
        <View className="mb-8">
          <Text className="text-white text-2xl font-semibold text-center leading-snug">
            {current.title}
          </Text>
          <Text className="text-white/80 text-sm text-center mt-3">
            Select all that apply.
          </Text>
        </View>

        {/* Options – frosted glass pills with white borders */}
        <View className="gap-3">
          {current.options.map((opt) => {
            const isSelected = selected.includes(opt);
            return (
              <Pressable
                key={opt}
                onPress={() => toggle(opt)}
                className="w-full rounded-full overflow-hidden"
                android_ripple={{ color: "rgba(255,255,255,0.12)" }}
              >
                <View className="border-2 rounded-full overflow-hidden"
                  style={{ borderColor: isSelected ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.35)" }}
                >
                  {!isSelected && (
                    <BlurView intensity={25} tint="light" className="absolute inset-0" />
                  )}
                  <View className={isSelected ? "bg-white px-5 py-4" : "px-5 py-4"}>
                    <Text className={isSelected ? "text-black font-medium" : "text-white"}>
                      {opt}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* CTA – disabled shows glassy pill; enabled uses white Wellness button */}
        <View className="items-center mt-10 mb-4">
          {disabled ? (
            <View className="w-[85%] rounded-full overflow-hidden">
              <BlurView intensity={25} tint="light" className="absolute inset-0" />
              <View className="h-14 px-8 rounded-full items-center justify-center border border-white/25">
                <Text className="text-white/80 font-semibold">Continue</Text>
              </View>
            </View>
          ) : (
            <CustomButton
              variant="wellness"
              fleurSize="lg"
              className="w-[85%]"
              onPress={goNext}
            >
              Continue
              <Feather name="arrow-right" size={18} color="#000" style={{ marginLeft: 8 }} />
            </CustomButton>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
