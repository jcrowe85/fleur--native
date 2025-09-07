// app/dashboard.tsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ImageBackground,
  Pressable,
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { CustomButton } from "../components/UI/CustomButton";
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from "react-native-svg";

/** ----------------------------------------------------------------
 * Mocked inputs from questionnaire (swap with real snapshot later)
 * ---------------------------------------------------------------- */
const SUMMARY =
  "You mentioned postpartum changes and increased shedding. During this time, many women experience hair loss due to mineral depletion and hormone shifts. This is normal — and manageable with the right support.";

type ToolKey = "supplement" | "serum" | "wash";

/** ----------------------------------------------------------------
 * Screen
 * ---------------------------------------------------------------- */
export default function Dashboard() {
  const insets = useSafeAreaInsets();

  // Wizard steps: 0 → Summary, 1 → Routine Importance, 2 → Tools
  const [step, setStep] = useState<0 | 1 | 2>(0);

  // “Do you already have this?” state by category + items added to bag
  const [alreadyHave, setAlreadyHave] = useState<Record<ToolKey, boolean>>({
    supplement: false,
    serum: false,
    wash: false,
  });
  const [bag, setBag] = useState<ToolKey[]>([]);

  const inBag = (k: ToolKey) => bag.includes(k);
  const toggleHave = (k: ToolKey) => setAlreadyHave((s) => ({ ...s, [k]: !s[k] }));
  const toggleBag = (k: ToolKey) =>
    setBag((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  const bagCount = bag.length;
  const bagLabel = useMemo(
    () => (bagCount ? `${bagCount} item${bagCount === 1 ? "" : "s"} selected` : "No items selected"),
    [bagCount]
  );

  const goNextFrom = (s: 0 | 1 | 2) => {
    if (s === 0) setStep(1);
    else if (s === 1) setStep(2);
    else {
      if (bag.length > 0) router.push("/cart");
      else router.push("/routine");
    }
  };

  const goBack = () => {
    if (step > 0) setStep((s) => (s - 1) as 0 | 1 | 2);
  };

  return (
    <View className="flex-1 bg-brand-bg">
      {/* Background */}
      <ImageBackground
        source={require("../../assets/dashboard.png")}
        resizeMode="cover"
        className="absolute inset-0"
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.15)", "rgba(0,0,0,0.35)", "rgba(0,0,0,0.65)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          className="absolute inset-0"
        />
      </ImageBackground>

      <StatusBar style="light" translucent backgroundColor="transparent" />

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
          {/* Header / Title */}
          <View className="flex-row items-center justify-center mb-6" style={{ paddingTop: 12 }}>
            {step > 0 && (
              <Pressable
                onPress={goBack}
                className="absolute left-0 p-2 rounded-full active:opacity-80"
                hitSlop={8}
              >
                <Feather name="arrow-left" size={22} color="#fff" />
              </Pressable>
            )}
            <View>
              <Text className="text-white text-[22px] font-semibold text-center">
                Stronger Hair Starts Here
              </Text>
              <Text className="text-white/80 text-sm text-center mt-1">
                Your routine, built around your needs.
              </Text>
            </View>
          </View>

          {/* === STEP 0: Journey + What We Learned === */}
          {step === 0 && (
            <>
              <GlassCard className="p-5 mb-6">
                <SectionHeader icon="trending-up" title="Journey to Healthier Hair" />

                {/* Large journey graph (animated, tooltip milestones) */}
                <RecoveryChart
                  weeks={16}
                  curve={{ startSlope: 0.08, accel: 0.22, plateauAt: 0.82 }}
                  durationMs={14000}
                  loop
                />

                {/* Two supportive mini stats */}
                <View className="mt-4 flex-row -mx-1">
                  <View className="flex-1 px-1">
                    <MiniStatTile
                      big="6–8 wks"
                      caption="First visible change"
                      helper="with consistent routine"
                    />
                  </View>
                  <View className="flex-1 px-1">
                    <MiniStatTile big="2.3×" caption="Better outcomes" helper="4+ days/week users" />
                  </View>
                </View>

                {/* What We Learned */}
                <View className="mt-6">
                  <SectionHeader icon="heart" title="What We Learned" />
                  <Text className="text-white/90 leading-snug mb-3">{SUMMARY}</Text>
                  <InlineInsights />
                </View>
              </GlassCard>

              <CustomButton
                variant="wellness"
                fleurSize="lg"
                className="w-full rounded-full"
                onPress={() => goNextFrom(0)}
              >
                See How Routine Makes the Difference →
              </CustomButton>
            </>
          )}

          {/* === STEP 1: Why Routine Matters === */}
          {step === 1 && (
            <>
              <GlassCard className="p-5 mb-6">
                <SectionHeader icon="clock" title="Why Routine Matters" />
                <View className="gap-3">
                  <TimelineRow week="Weeks 1–4" note="Scalp stimulation & comfort improve" />
                  <TimelineRow week="Weeks 4–8" note="Shedding begins to normalize" />
                  <TimelineRow week="Weeks 8–12" note="Stronger strands & early density gains" />
                </View>

                <View className="mt-4 rounded-lg bg-white/10 border border-white/20 p-3 flex-row items-start gap-3">
                  <View className="p-1.5 rounded-full bg-white/20">
                    <Feather name="info" size={14} color="#fff" />
                  </View>
                  <Text className="text-white/90 text-sm leading-snug">
                    Hair growth isn’t instant — but consistent daily actions are what deliver results.
                    We’ll keep you on track with reminders and a clear AM/PM plan.
                  </Text>
                </View>
              </GlassCard>

              <CustomButton
                variant="wellness"
                fleurSize="lg"
                className="w-full rounded-full"
                onPress={() => goNextFrom(1)}
              >
                Build My Routine →
              </CustomButton>
            </>
          )}

          {/* === STEP 2: The Tools to Power Your Routine === */}
          {step === 2 && (
            <>
              <GlassCard className="p-5 mb-6">
                <SectionHeader icon="tool" title="The Tools to Power Your Routine" />
                <Text className="text-white/85 text-sm leading-snug mb-3">
                  If you already use something similar, great — keep it! If not, you can add ours now or later.
                </Text>

                {[
                  {
                    id: "supplement" as ToolKey,
                    title: "Daily Hair Supplement",
                    icon: "activity" as const,
                    desc: "Replenishes key minerals",
                  },
                  {
                    id: "serum" as ToolKey,
                    title: "Peptide Scalp Serum",
                    icon: "droplet" as const,
                    desc: "Targets follicles directly",
                  },
                  {
                    id: "wash" as ToolKey,
                    title: "Gentle Cleanse + Nourish",
                    icon: "wind" as const,
                    desc: "Hydration + scalp comfort",
                  },
                ].map((s) => {
                  const have = alreadyHave[s.id];
                  const added = inBag(s.id);
                  return (
                    <View
                      key={s.id}
                      className={[
                        "rounded-xl border p-4 mb-3",
                        added ? "bg-white/20 border-white/30" : "bg-white/10 border-white/20",
                      ].join(" ")}
                    >
                      <View className="flex-row items-center justify-between mb-1">
                        <View className="flex-row items-center">
                          <View className="p-1.5 rounded-full bg-white/15 mr-2">
                            <Feather name={s.icon} size={14} color="#fff" />
                          </View>
                          <Text className="text-white font-semibold">{s.title}</Text>
                        </View>
                        <Pressable
                          onPress={() =>
                            setAlreadyHave((prev) => ({ ...prev, [s.id]: !prev[s.id] }))
                          }
                        >
                          <Text className="text-white/90 underline">
                            {have ? "I’ll use mine" : "I already have one"}
                          </Text>
                        </Pressable>
                      </View>
                      <Text className="text-white/80 text-[12px] mb-3">{s.desc}</Text>

                      {!have && (
                        <View className="flex-row items-center justify-between">
                          <Text className="text-white/75 text-sm">
                            {added ? "Added" : "Add to bag?"}
                          </Text>
                          <Pressable onPress={() => toggleBag(s.id)}>
                            <Text className="text-white underline">{added ? "Remove" : "Add"}</Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  );
                })}

                <View className="mt-2 flex-row items-center justify-between">
                  <Text className="text-white/80 text-sm">{bagLabel}</Text>
                  <Pressable
                    onPress={() => {
                      const needed: ToolKey[] = ["supplement", "serum", "wash"].filter(
                        (id) => !alreadyHave[id]
                      );
                      setBag((prev) => Array.from(new Set([...prev, ...needed])));
                    }}
                  >
                    <Text className="text-white/90 underline">Add all I need</Text>
                  </Pressable>
                </View>
              </GlassCard>

              <CustomButton
                variant="wellness"
                fleurSize="lg"
                className="w-full rounded-full"
                onPress={() => goNextFrom(2)}
              >
                Start My Regimen →
              </CustomButton>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/** ----------------------------------------------------------------
 * Subcomponents
 * ---------------------------------------------------------------- */
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

function TimelineRow({ week, note }: { week: string; note: string }) {
  return (
    <View className="flex-row items-start gap-3 rounded-lg bg-white/10 border border-white/20 p-3">
      <View className="p-1.5 rounded-full bg-white/15">
        <Feather name="check" size={14} color="#fff" />
      </View>
      <View className="flex-1">
        <Text className="text-white font-semibold">{week}</Text>
        <Text className="text-white/85 text-sm leading-snug">{note}</Text>
      </View>
    </View>
  );
}

/** =================== INLINE INSIGHTS (4 compact tiles, single row) =================== */
function InlineInsights() {
  const stats = {
    peakSheddingPct: 68,
    routineImprovementMult: 2,
    supplementPct: 54,
    dailyHeatPct: 18,
  };

  return (
    <View className="flex-row gap-2">
      <TinyTile big={`${stats.peakSheddingPct}%`} caption="Peak 3–6mo" />
      <TinyTile big={`${stats.routineImprovementMult}×`} caption="Week 8 gains" />
      <TinyTile big={`${stats.supplementPct}%`} caption="Supp use" />
      <TinyTile big={`${stats.dailyHeatPct}%`} caption="Daily heat" />
    </View>
  );
}

function TinyTile({ big, caption }: { big: string; caption: string }) {
  return (
    <View className="flex-1 rounded-lg overflow-hidden border border-white/15">
      <BlurView intensity={15} tint="light" className="absolute inset-0" />
      <View className="relative items-center py-2 px-1">
        <Text className="text-white" style={{ fontSize: 14, fontWeight: "700" }}>
          {big}
        </Text>
        <Text className="text-white/70 text-[10px] mt-0.5 text-center">{caption}</Text>
      </View>
    </View>
  );
}

/** Small stat tile used above */
function MiniStatTile({
  big,
  caption,
  helper,
}: {
  big: string;
  caption: string;
  helper?: string;
}) {
  return (
    <View className="rounded-lg bg-white/10 border border-white/20 p-3 items-center">
      <Text className="text-white text-base font-semibold">{big}</Text>
      <Text className="text-white/80 text-xs">{caption}</Text>
      {helper ? <Text className="text-white/60 text-[10px] mt-0.5">{helper}</Text> : null}
    </View>
  );
}

/** ---------- Animated RecoveryChart (clean tooltips, no icon row) ---------- */
/** ---------- Animated RecoveryChart (no container, downward captions, subtle glow) ---------- */
function RecoveryChart({
  weeks,
  curve,
  durationMs = 48000,
  loop = true,
}: {
  weeks: number;
  curve: { startSlope: number; accel: number; plateauAt: number };
  durationMs?: number;
  loop?: boolean;
}) {
  const width = 340;
  const height = 140;
  const pad = 12;

  // Build curve points
  const pts = React.useMemo(() => {
    const out: { x: number; y: number; t: number }[] = [];
    for (let i = 0; i <= weeks; i++) {
      const t = i / weeks;
      const y = curve.plateauAt * (1 / (1 + Math.exp(-(t * 8 - 4))));
      out.push({ x: t, y, t });
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

  // Progress animation
  const progress = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    const play = () =>
      Animated.timing(progress, {
        toValue: 1,
        duration: durationMs,
        easing: Easing.linear, // steady sweep
        useNativeDriver: false,
      });
    if (loop) {
      const seq = Animated.sequence([
        Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: false }),
        play(),
      ]);
      const looper = Animated.loop(seq);
      looper.start();
      return () => looper.stop();
    } else {
      play().start();
    }
  }, [durationMs, loop, progress]);

  // Interpolated dot coords
  const inputRange = pts.map((p) => p.t);
  const cx = progress.interpolate({ inputRange, outputRange: pts.map((p) => px(p.x)) });
  const cy = progress.interpolate({ inputRange, outputRange: pts.map((p) => py(p.y)) });

  // Milestones
  const milestoneConfig = [
    { week: 0,  msg: "Getting started" },
    { week: 4,  msg: "Consistency taking hold" },
    { week: 8,  msg: "Scalp feel improving" },
    { week: 12, msg: "Visible progress" },
  ];

  // Timing windows
  const appear = 0.02;
  const hold   = 0.20;
  const fade   = 0.02;

  // Caption layout
  const CENTER_X = pad + (width - pad * 2) / 2;
  const TOOLTIP_WIDTH = 200;
  const HALF_W = TOOLTIP_WIDTH / 2;
  const TIP_BASE_Y = 8;
  const TIP_DROP   = 12;

  const ms = milestoneConfig.map((m) => {
    const threshold = m.week / weeks;

    const tipOpacity = progress.interpolate({
      inputRange: [
        threshold - appear,
        threshold,
        threshold + hold,
        threshold + hold + fade,
      ],
      outputRange: [0, 1, 1, 0],
      extrapolate: "clamp",
    });

    const tipShiftDown = progress.interpolate({
      inputRange: [
        threshold - appear,
        threshold,
        threshold + hold,
        threshold + hold + fade,
      ],
      outputRange: [0, TIP_DROP, TIP_DROP, 0],
      extrapolate: "clamp",
    });

    const glowOpacity = progress.interpolate({
      inputRange: [threshold - appear, threshold, threshold + appear],
      outputRange: [0, 0.5, 0],
      extrapolate: "clamp",
    });
    const glowRadius = progress.interpolate({
      inputRange: [threshold - appear, threshold, threshold + appear],
      outputRange: [14, 20, 26],
      extrapolate: "clamp",
    });

    return { msg: m.msg, tipOpacity, tipShiftDown, glowOpacity, glowRadius };
  });

  const AnimatedCircleAny = Animated.createAnimatedComponent(Circle) as any;

  return (
    <View style={{ alignItems: "center" }}>
      {/* Chart only (no container card) */}
      <Svg width={width} height={height}>
        <Defs>
          <SvgGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="white" stopOpacity={0.2} />
            <Stop offset="1" stopColor="white" stopOpacity={0.02} />
          </SvgGradient>
          <SvgGradient id="stroke" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="white" stopOpacity={0.95} />
            <Stop offset="1" stopColor="white" stopOpacity={0.5} />
          </SvgGradient>
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

        {/* subtle milestone glow */}
        {ms.map((m, i) => (
          <AnimatedCircleAny
            key={`glow-${i}`}
            cx={cx}
            cy={cy}
            r={m.glowRadius}
            fill="rgba(255,255,255,0.10)"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth={0.8}
            opacity={m.glowOpacity as any}
          />
        ))}

        {/* dot */}
        <AnimatedCircleAny cx={cx} cy={cy} r={8} fill="rgba(255,255,255,0.18)" />
        <AnimatedCircleAny cx={cx} cy={cy} r={4} fill="#fff" />
      </Svg>

      {/* captions floating below top edge */}
      {ms.map((m, i) => (
        <Animated.View
          key={`tip-${i}`}
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            opacity: m.tipOpacity as any,
            transform: [
              { translateX: (CENTER_X - HALF_W) as any },
              { translateY: TIP_BASE_Y as any },
              { translateY: m.tipShiftDown as any },
            ],
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              color: "#fff",
              fontSize: 12,
              fontWeight: "600",
              textAlign: "center",
              width: TOOLTIP_WIDTH,
            }}
          >
            {m.msg}
          </Text>
        </Animated.View>
      ))}

      {/* axis labels */}
      <View className="mt-2 flex-row justify-between w-[340px]">
        <Text className="text-white/70 text-[10px]">Week 0</Text>
        <Text className="text-white/70 text-[10px]">Week {weeks}</Text>
      </View>
    </View>
  );
}

