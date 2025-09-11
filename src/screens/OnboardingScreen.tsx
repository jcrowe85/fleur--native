// app/OnboardingScreen.tsx
import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ImageBackground,
  Pressable,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { CustomButton } from "../components/UI/CustomButton";

// 🔹 NEW: bring in your plan client + store
import { fetchPlan } from "@/services/planClient";
import { usePlanStore } from "@/state/planStore";

/** ================================================================
 * PHASE CONTROLLER
 * ================================================================ */
type Phase = "questions" | "auth" | "setup";

// 🔹 Type used for server input
type PlanInput = {
  persona: "menopause" | "postpartum" | "general";
  hairType: string;     // e.g., "fine-straight"
  washFreq: string;     // e.g., "2x/week"
  goals: string[];      // e.g., ["reduce shedding"]
  constraints?: string; // optional, semicolon-joined tags
};

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState<Phase>("questions");
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [authForm, setAuthForm] = useState<{ email?: string; password?: string }>({});

  // 🔹 NEW: hold the derived plan input used by SetupSequence
  const [planInput, setPlanInput] = useState<PlanInput | null>(null);

  const goToAuth = useCallback(() => setPhase("auth"), []);

  // 🔹 Compute planInput when moving into setup (from your current answers)
  const startSetup = useCallback(() => {
    const input = answersToPlanInput(answers);
    setPlanInput(input);
    setPhase("setup");
  }, [answers]);

  return (
    <View className="flex-1 bg-black">
      <Background />
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <SafeAreaView
        className="flex-1 px-6 pt-2"
        edges={["top", "left", "right"]}
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        {phase === "questions" && (
          <Questionnaire
            answers={answers}
            setAnswers={setAnswers}
            onComplete={goToAuth}
          />
        )}

        {phase === "auth" && (
          <AuthStep
            authForm={authForm}
            setAuthForm={setAuthForm}
            onContinue={startSetup}
          />
        )}

        {phase === "setup" && (
          <SetupSequence
            planInput={planInput}                          // 👈 pass the derived input
            onDone={() => router.replace("/(plan)/summary")}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

/** ================================================================
 * SHARED BACKGROUND
 * ================================================================ */
function Background() {
  return (
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
  );
}

/** ================================================================
 * TEXTS — (unchanged)
 * ================================================================ */
const TEXTS = {
  q1_concern: {
    title: "My biggest hair concern is:",
    subtitle: "Choose one option.",
    options: {
      opt_crown_temples: "Thinning at crown / temples",
      opt_excess_shedding: "Excess shedding",
      opt_breakage_dryness: "Breakage / dryness",
      opt_lack_volume: "lack of volume/thickness",
      opt_scalp_irritation: "Scalp irritation or flaking",
      opt_other: "Other",
    },
  },
  q2_lifestage: {
    title: "I am currently experiencing:",
    subtitle: "Select all that apply.",
    options: {
      opt_postpartum: "Post-partum changes",
      opt_menopause: "Menopause / Perimenopause",
      opt_illness_stress: "Recent illness or stress",
      opt_diet_change: "Major diet / lifestyle change",
      opt_none: "None of the above",
    },
  },
  q2a_postpartum_details: {
    title: "I gave birth within the last:",
    subtitle: "Select all that apply.",
    options: {
      opt_pp_0_3: "0-3 months",
      opt_pp_3_6: "3-6 months",
      opt_pp_6_12: "6–12 months",
      opt_pp_over_year: "over a year ago",
    },
  },
  q2b_menopause_details: {
    title: "My menopause stage is:",
    subtitle: "Choose one option.",
    options: {
      opt_meno_peri: "Perimenopause",
      opt_meno_meno: "Menopause",
      opt_meno_post: "Post-menopause",
    },
  },
  q3_type: {
    title: "I would describe my hair type as:",
    subtitle: "Choose one option.",
    options: {
      opt_straight: "Straight",
      opt_wavy: "Wavy",
      opt_curly: "Curly",
      opt_coily: "Coily",
    },
  },
  q4_texture: {
    title: "I would describe my hair texture as:",
    subtitle: "Choose one option.",
    options: {
      opt_fine: "Fine",
      opt_medium: "Medium",
      opt_coarse: "Coarse",
    },
  },
  q5_scalp: {
    title: "My scalp type is:",
    subtitle: "Choose one option.",
    options: {
      opt_oily: "Oily",
      opt_dry: "Dry",
      opt_sensitive: "Sensitive",
      opt_balanced: "Balanced / Normal",
    },
  },
  q6_wash: {
    title: "I wash my hair at least:",
    subtitle: "Choose one option.",
    options: {
      opt_daily: "Daily",
      opt_every_2_3: "Every 2-3 days",
      opt_twice_week: "Twice a week",
      opt_once_week_or_less: "Once a week or less",
    },
  },
  q7_goal: {
    title: "My main hair goal is:",
    subtitle: "Choose one option.",
    options: {
      opt_goal_regrow: "Regrow / thicken",
      opt_goal_reduce_shedding: "Reduce shedding",
      opt_goal_scalp_health: "Improve scalp health",
      opt_goal_strengthen: "Strengthen strands",
      opt_goal_shine: "Add shine & softness",
      opt_goal_wellness: "Support long-term wellness",
    },
  },
  q8_color: {
    title: "I color or chemically treat my hair:",
    subtitle: "Choose one option.",
    options: {
      opt_color_regularly: "Yes, regularly",
      opt_color_occasionally: "Yes, occasionally",
      opt_color_no: "No",
    },
  },
  q9_heat: {
    title: "I use heat styling tools:",
    subtitle: "Choose one option.",
    options: {
      opt_heat_daily: "Yes, daily",
      opt_heat_few_per_week: "Yes, a few times per week",
      opt_heat_rare: "Rarely",
      opt_heat_never: "Never",
    },
  },
  q10_treatments: {
    title: "I take hair supplements or treatments:",
    subtitle: "Choose one option.",
    options: {
      opt_tx_daily_supp: "Yes, daily supplements",
      opt_tx_rx: "Yes, prescriptions (e.g. minoxidil, finasteride)",
      opt_tx_none: "No, not currently",
    },
  },
} as const;

/** ================================================================
 * QUESTION CONFIG (unchanged)
 * ================================================================ */
type Option = { id: string; label: string };
type Question = {
  id: keyof typeof TEXTS;
  title: string;
  subtitle?: string;
  options: Option[];
  singleSelect?: boolean;
  visibleIf?: (answers: Record<string, string[]>) => boolean;
};
const toOptions = (o: Record<string, string>): Option[] =>
  Object.entries(o).map(([id, label]) => ({ id, label }));

const QUESTIONS: Question[] = [
  { id: "q1_concern", title: TEXTS.q1_concern.title, subtitle: TEXTS.q1_concern.subtitle, options: toOptions(TEXTS.q1_concern.options), singleSelect: true },
  { id: "q2_lifestage", title: TEXTS.q2_lifestage.title, subtitle: TEXTS.q2_lifestage.subtitle, options: toOptions(TEXTS.q2_lifestage.options), singleSelect: false },
  {
    id: "q2a_postpartum_details",
    title: TEXTS.q2a_postpartum_details.title,
    subtitle: TEXTS.q2a_postpartum_details.subtitle,
    options: toOptions(TEXTS.q2a_postpartum_details.options),
    visibleIf: (answers) => (answers["q2_lifestage"] || []).includes("opt_postpartum"),
  },
  {
    id: "q2b_menopause_details",
    title: TEXTS.q2b_menopause_details.title,
    subtitle: TEXTS.q2b_menopause_details.subtitle,
    options: toOptions(TEXTS.q2b_menopause_details.options),
    visibleIf: (answers) => (answers["q2_lifestage"] || []).includes("opt_menopause"),
    singleSelect: true,
  },
  { id: "q3_type", title: TEXTS.q3_type.title, subtitle: TEXTS.q3_type.subtitle, options: toOptions(TEXTS.q3_type.options), singleSelect: true },
  { id: "q4_texture", title: TEXTS.q4_texture.title, subtitle: TEXTS.q4_texture.subtitle, options: toOptions(TEXTS.q4_texture.options), singleSelect: true },
  { id: "q5_scalp", title: TEXTS.q5_scalp.title, subtitle: TEXTS.q5_scalp.subtitle, options: toOptions(TEXTS.q5_scalp.options), singleSelect: true },
  { id: "q6_wash", title: TEXTS.q6_wash.title, subtitle: TEXTS.q6_wash.subtitle, options: toOptions(TEXTS.q6_wash.options), singleSelect: true },
  { id: "q7_goal", title: TEXTS.q7_goal.title, subtitle: TEXTS.q7_goal.subtitle, options: toOptions(TEXTS.q7_goal.options), singleSelect: true },
  { id: "q8_color", title: TEXTS.q8_color.title, subtitle: TEXTS.q8_color.subtitle, options: toOptions(TEXTS.q8_color.options), singleSelect: true },
  { id: "q9_heat", title: TEXTS.q9_heat.title, subtitle: TEXTS.q9_heat.subtitle, options: toOptions(TEXTS.q9_heat.options), singleSelect: true },
  { id: "q10_treatments", title: TEXTS.q10_treatments.title, subtitle: TEXTS.q10_treatments.subtitle, options: toOptions(TEXTS.q10_treatments.options), singleSelect: true },
];

/** ================================================================
 * Answers → PlanInput (server payload)
 * ================================================================ */
function answersToPlanInput(ans: Record<string, string[]>): PlanInput {
  // Persona
  const life = ans["q2_lifestage"] || [];
  const persona: PlanInput["persona"] =
    life.includes("opt_menopause") ? "menopause" :
    life.includes("opt_postpartum") ? "postpartum" : "general";

  // Hair type (texture + type)
  const typeMap: Record<string, string> = {
    opt_straight: "straight",
    opt_wavy: "wavy",
    opt_curly: "curly",
    opt_coily: "coily",
  };
  const textureMap: Record<string, string> = {
    opt_fine: "fine",
    opt_medium: "medium",
    opt_coarse: "coarse",
  };
  const typeStr = typeMap[(ans["q3_type"] || [])[0]] || "unknown";
  const textureStr = textureMap[(ans["q4_texture"] || [])[0]] || "unknown";
  const hairType = `${textureStr}-${typeStr}`;

  // Wash frequency
  const washMap: Record<string, string> = {
    opt_daily: "daily",
    opt_every_2_3: "every 2–3 days",
    opt_twice_week: "2x/week",
    opt_once_week_or_less: "1x/week or less",
  };
  const washFreq = washMap[(ans["q6_wash"] || [])[0]] || "unknown";

  // Single goal
  const goalMap: Record<string, string> = {
    opt_goal_regrow: "increase thickness",
    opt_goal_reduce_shedding: "reduce shedding",
    opt_goal_scalp_health: "improve scalp health",
    opt_goal_strengthen: "strengthen strands",
    opt_goal_shine: "add shine & softness",
    opt_goal_wellness: "long-term wellness",
  };
  const goals = [goalMap[(ans["q7_goal"] || [])[0]] || "general improvement"];

  // Optional constraints/tags
  const tags: string[] = [];

  const colorId = (ans["q8_color"] || [])[0];
  if (colorId === "opt_color_regularly") tags.push("color-treated: regularly");
  else if (colorId === "opt_color_occasionally") tags.push("color-treated: occasionally");

  const heatMap: Record<string, string> = {
    opt_heat_daily: "heat: daily",
    opt_heat_few_per_week: "heat: few times per week",
    opt_heat_rare: "heat: rarely",
    opt_heat_never: "heat: never",
  };
  const heatId = (ans["q9_heat"] || [])[0];
  if (heatMap[heatId]) tags.push(heatMap[heatId]);

  const txId = (ans["q10_treatments"] || [])[0];
  if (txId === "opt_tx_daily_supp") tags.push("daily supplements");
  else if (txId === "opt_tx_rx") tags.push("prescriptions (e.g., minoxidil)");

  const menoStage = (ans["q2b_menopause_details"] || [])[0];
  const ppWindow = (ans["q2a_postpartum_details"] || [])[0];
  if (menoStage) tags.push(`menopause-stage: ${menoStage}`);
  if (ppWindow) tags.push(`postpartum-window: ${ppWindow}`);

  return {
    persona,
    hairType,
    washFreq,
    goals,
    constraints: tags.length ? tags.join("; ") : undefined,
  };
}

/** ================================================================
 * QUESTIONNAIRE (unchanged UI)
 * ================================================================ */
function Questionnaire({
  answers,
  setAnswers,
  onComplete,
}: {
  answers: Record<string, string[]>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  onComplete: () => void;
}) {
  const visibleIds = useMemo(
    () => QUESTIONS.filter((q) => (q.visibleIf ? q.visibleIf(answers) : true)).map((q) => q.id),
    [answers]
  );

  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    if (stepIdx >= visibleIds.length) setStepIdx(Math.max(0, visibleIds.length - 1));
  }, [visibleIds, stepIdx]);

  const currentId = visibleIds[stepIdx];
  const current = QUESTIONS.find((q) => q.id === currentId)!;
  const selected = answers[current.id as string] || [];

  // progress
  const total = visibleIds.length || 1;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pct = useMemo(() => ((stepIdx + 1) / total) * 100, [stepIdx, total]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: pct,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct, progressAnim]);

  const toggle = (question: Question, optionId: string) => {
    setAnswers((prev) => {
      const prevArr = prev[question.id as string] || [];
      let nextArr: string[];

      if (question.singleSelect) {
        nextArr = prevArr.includes(optionId) ? [] : [optionId];
      } else {
        const set = new Set(prevArr);
        set.has(optionId) ? set.delete(optionId) : set.add(optionId);
        nextArr = Array.from(set);
      }

      const next = { ...prev, [question.id as string]: nextArr };

      if (question.id === "q2_lifestage") {
        const hasPP = nextArr.includes("opt_postpartum");
        const hasMeno = nextArr.includes("opt_menopause");
        if (!hasPP && next["q2a_postpartum_details"]) delete next["q2a_postpartum_details"];
        if (!hasMeno && next["q2b_menopause_details"]) delete next["q2b_menopause_details"];
      }
      return next;
    });
  };

  const goNext = () => {
    const isLastVisibleStep = stepIdx === visibleIds.length - 1;
    if (isLastVisibleStep) {
      onComplete();
      return;
    }
    setStepIdx((i) => Math.min(i + 1, visibleIds.length - 1));
  };

  const goBack = () => {
    if (stepIdx > 0) setStepIdx((i) => i - 1);
    else router.back();
  };

  const disabled = selected.length === 0;

  return (
    <>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-6">
        <Pressable onPress={goBack} className="p-2 rounded-full active:opacity-80" hitSlop={8}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </Pressable>
        <Text className="text-white/80 text-sm">Step {stepIdx + 1} of {total}</Text>
        <View className="w-8" />
      </View>

      {/* Progress */}
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

      {/* Question */}
      <View className="mb-8">
        <Text className="text-white text-2xl font-semibold text-center leading-snug">
          {TEXTS[current.id].title}
        </Text>
        <Text className="text-white/80 text-sm text-center mt-3">
          {TEXTS[current.id].subtitle ??
            (current.singleSelect ? "Choose one option." : "Select all that apply.")}
        </Text>
      </View>

      {/* Options */}
      <View className="gap-3">
        {current.options.map((opt) => {
          const isSelected = selected.includes(opt.id);
          return (
            <Pressable
              key={opt.id}
              onPress={() => toggle(current, opt.id)}
              className="w-full rounded-full overflow-hidden"
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              <View
                className="border-2 rounded-full overflow-hidden"
                style={{ borderColor: isSelected ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.35)" }}
              >
                {!isSelected && <BlurView intensity={25} tint="light" className="absolute inset-0" />}
                <View className={isSelected ? "bg-white px-5 py-4" : "px-5 py-4"}>
                  <Text className={isSelected ? "text-black font-medium" : "text-white"}>{opt.label}</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* CTA */}
      <View className="items-center mt-10 mb-4">
        {disabled ? (
          <View className="w-[85%] rounded-full overflow-hidden">
            <BlurView intensity={25} tint="light" className="absolute inset-0" />
            <View className="h-14 px-8 rounded-full items-center justify-center border border-white/25">
              <View className="flex-row items-center">
                <Text className="text-white/60 font-semibold">Continue</Text>
                <Feather name="arrow-right" size={18} color="rgba(255,255,255,0.6)" style={{ marginLeft: 14 }} />
              </View>
            </View>
          </View>
        ) : (
          <CustomButton variant="wellness" fleurSize="lg" className="w-[85%]" onPress={goNext}>
            Continue
            <Feather name="arrow-right" size={18} color="#000" style={{ marginLeft: 8 }} />
          </CustomButton>
        )}
      </View>
    </>
  );
}

/** ================================================================
 * AUTH STEP (unchanged visuals)
 * ================================================================ */
function AuthStep({
  authForm,
  setAuthForm,
  onContinue,
}: {
  authForm: { email?: string; password?: string };
  setAuthForm: React.Dispatch<React.SetStateAction<{ email?: string; password?: string }>>;
  onContinue: () => void;
}) {
  return (
    <View className="flex-1 justify-center">
      <Text className="text-white text-3xl font-semibold leading-tight mb-8 text-center">
        Create your account
      </Text>
      <View className="items-center">
        <CustomButton variant="wellness" fleurSize="lg" className="w-[85%]" onPress={onContinue}>
          Continue
        </CustomButton>
        <Text className="text-white/60 text-xs mt-3">We'll personalize your routine next.</Text>
      </View>
    </View>
  );
}

/** ================================================================
 * SETUP SEQUENCE — runs animation + plan fetch in parallel
 * ================================================================ */
function SetupSequence({
  planInput,
  onDone,
}: {
  planInput: PlanInput | null;
  onDone: () => void;
}) {
  const MIN_STEP_MS = 3000;
  const FINAL_PAUSE_MS = 700;

  const steps = [
    "Analyzing your answers",
    "Identifying your hair concerns",
    "Building your daily routine",
    "Recommending key products",
    "Setting up progress tracking",
  ] as const;

  const [active, setActive] = useState(0);
  const { height: H } = Dimensions.get("window");
  const TOP_OFFSET = Math.max(24, Math.round(H * 0.25));

  const pulse = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  const setPlan = usePlanStore((s) => s.setPlan);

  // Step animation as a promise
  function runSteps(): Promise<void> {
    return new Promise(async (resolve) => {
      for (let i = 0; i < steps.length; i++) {
        setActive(i);
        await new Promise((r) => setTimeout(r, MIN_STEP_MS));
      }
      await new Promise((r) => setTimeout(r, FINAL_PAUSE_MS));
      resolve();
    });
  }

  // Fetch plan (with graceful fallback if planInput is null)
  async function buildPlan(): Promise<void> {
    try {
      if (!planInput) throw new Error("Missing planInput");
      const plan = await fetchPlan(planInput);
      setPlan(plan);
    } catch (e) {
      console.warn("plan build failed, using fallback:", e);
      setPlan({
        summary: {
          headline: "Personalizing your routine",
          subhead: "We’ll refine details shortly.",
          why: ["Hydration", "Gentle cleansing", "Heat protection"],
        },
        routine: {
          weeklyPillars: [
            { text: "Cleanse 2×/week" },
            { text: "Nightly scalp massage" },
            { text: "Use heat protectant" },
            { text: "Low-tension styles" },
          ],
          notes: ["Stay hydrated", "Silk pillowcase helps reduce friction"],
        },
        recommendations: [],
      } as any);
    }
  }

  // Drive both in parallel; finish when BOTH are complete
  useEffect(() => {
    let cancelled = false;

    const startPulse = () => {
      loopRef.current?.stop?.();
      pulse.setValue(0);
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ])
      );
      loop.start();
      loopRef.current = loop;
    };

    (async () => {
      startPulse();
      await Promise.all([runSteps(), buildPlan()]);
      if (!cancelled) onDone();
    })();

    return () => {
      cancelled = true;
      loopRef.current?.stop?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });

  return (
    <View className="flex-1 px-6">
      <View style={{ marginTop: TOP_OFFSET, marginBottom: 24 }}>
        <Text className="w-full text-white text-2xl font-semibold text-center leading-snug" />
      </View>

      <View className="w-full items-center">
        <Animated.Text
          style={{
            textAlign: "center",
            fontSize: 16,
            fontWeight: "300",
            color: "#ffffff",
            includeFontPadding: false as any,
            opacity,
          }}
        >
          {steps[active]}
        </Animated.Text>
        <Text className="text-white/60 mt-8" style={{ fontSize: 12, includeFontPadding: false as any }} />
      </View>
    </View>
  );
}
