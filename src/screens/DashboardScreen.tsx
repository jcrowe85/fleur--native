// src/screens/DashboardScreen.tsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  ImageBackground,
  Pressable,
  Animated,
  Easing,
  StyleSheet,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Svg, { Path, Circle, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import dayjs from "dayjs";

import { useRoutineStore, RoutineStep } from "@/state/routineStore";
import { useRewardsStore } from "@/state/rewardsStore";
import { onDailyCheckIn } from "@/services/rewards";
import { ScreenScrollView } from "@/components/UI/bottom-space"; // ✅ unified bottom-spacing helper

// ⭐ Small Rewards Pill (compact variant supported)
import RewardsPill from "@/components/UI/RewardsPill";
import DailyHairCheckIn from "@/components/DailyHairCheckIn";

/* ------------------------------- tier math ------------------------------- */

const TIERS = [
  { key: "Bronze", cutoff: 0 },
  { key: "Silver", cutoff: 250 },
  { key: "Gold", cutoff: 500 },
  { key: "Platinum", cutoff: 1000 },
];

function tierInfo(points: number) {
  let current = TIERS[0];
  for (const t of TIERS) if (points >= t.cutoff) current = t;
  const idx = TIERS.findIndex((t) => t.key === current.key);
  const next = TIERS[idx + 1] ?? null;
  const remaining = next ? Math.max(0, next.cutoff - points) : 0;
  const percent = next
    ? Math.min(1, Math.max(0, (points - current.cutoff) / (next.cutoff - current.cutoff)))
    : 1;

  return {
    currentLabel: current.key,
    nextLabel: next?.key ?? "Max",
    remainingLabel: next ? `${remaining} pts to ${next.key}` : "Top tier reached",
    percent,
  };
}

/* ---------------------------- chart subcomponent ---------------------------- */

function RecoveryChart({
  weeks,
  curve,
  durationMs = 24000,
  loop = true,
}: {
  weeks: number;
  curve: { plateauAt: number };
  durationMs?: number;
  loop?: boolean;
}) {
  const width = 340;
  const height = 140;
  const pad = 12;

  const pts = useMemo(() => {
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

  const pathLine = useMemo(
    () => pts.map((p, i) => `${i === 0 ? "M" : "L"}${px(p.x)},${py(p.y)}`).join(" "),
    [pts]
  );
  const pathArea = useMemo(
    () => `${pathLine} L${width - pad},${height - pad} L${pad},${height - pad} Z`,
    [pathLine]
  );

  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const play = () =>
      Animated.timing(progress, {
        toValue: 1,
        duration: durationMs,
        easing: Easing.linear,
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

  const inputRange = pts.map((p) => p.t);
  const cx = progress.interpolate({ inputRange, outputRange: pts.map((p) => px(p.x)) });
  const cy = progress.interpolate({ inputRange, outputRange: pts.map((p) => py(p.y)) });

  const AnimatedCircleAny = Animated.createAnimatedComponent(Circle) as any;

  const milestones = [0, 4, 8, 12].map((week) => ({
    threshold: week / weeks,
    label:
      week === 0
        ? "Getting started"
        : week === 4
        ? "Consistency taking hold"
        : week === 8
        ? "Scalp feel improving"
        : "Visible progress",
  }));

  const CENTER_X = pad + (width - pad * 2) / 2;
  const CAP_W = 200;
  const CAP_TOP = 8;

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={width} height={height}>
        <Defs>
          <SvgGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="white" stopOpacity={0.22} />
            <Stop offset="1" stopColor="white" stopOpacity={0.04} />
          </SvgGradient>
          <SvgGradient id="stroke" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="white" stopOpacity={0.95} />
            <Stop offset="1" stopColor="white" stopOpacity={0.5} />
          </SvgGradient>
        </Defs>

        {/* baseline */}
        <Path
          d={`M${pad},${height - pad} L${width - pad},${height - pad}`}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={1}
        />

        {/* curve */}
        <Path d={pathArea} fill="url(#area)" />
        <Path d={pathLine} stroke="url(#stroke)" strokeWidth={2} fill="none" />

        {/* dot glow + dot */}
        <AnimatedCircleAny cx={cx} cy={cy} r={10} fill="rgba(255,255,255,0.10)" />
        <AnimatedCircleAny cx={cx} cy={cy} r={4} fill="#fff" />
      </Svg>

      {/* captions */}
      {milestones.map((m, i) => {
        const opacity = progress.interpolate({
          inputRange: [m.threshold - 0.02, m.threshold, m.threshold + 0.22],
          outputRange: [0, 1, 0],
          extrapolate: "clamp",
        });
        const dy = progress.interpolate({
          inputRange: [m.threshold - 0.02, m.threshold, m.threshold + 0.22],
          outputRange: [0, 12, 12],
          extrapolate: "clamp",
        });

        return (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={{
              position: "absolute",
              top: CAP_TOP,
              left: CENTER_X - CAP_W / 2,
              width: CAP_W,
              opacity,
              transform: [{ translateY: dy as any }],
            }}
          >
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600", textAlign: "center" }}>
              {m.label}
            </Text>
          </Animated.View>
        );
      })}

      {/* x-axis labels */}
      <View
        style={{
          marginTop: 6,
          width,
          paddingHorizontal: 8,
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <Text style={styles.axisLabel}>Week 0</Text>
        <Text style={styles.axisLabel}>Week {weeks}</Text>
      </View>
    </View>
  );
}

/* --------------------------------- screen --------------------------------- */

export default function DashboardScreen() {
  // Routine store
  const stepsByPeriod = useRoutineStore((s) => s.stepsByPeriod);
  const isCompletedToday = useRoutineStore((s) => s.isCompletedToday);
  const toggleStepToday = useRoutineStore((s) => s.toggleStepToday);
  const completedByDate = useRoutineStore((s) => s.completedByDate);
  const stepsAll = useRoutineStore((s) => s.steps); // subscribe to steps
  const applyDefaultIfEmpty = useRoutineStore((s) => s.applyDefaultIfEmpty);

  // Track check-in component visibility for spacing
  const [checkInVisible, setCheckInVisible] = useState(true);

  // Ensure defaults exist when dashboard is the first screen opened
  useEffect(() => {
    applyDefaultIfEmpty();
  }, [applyDefaultIfEmpty]);

  // Rewards store
  const points = useRewardsStore((s) => s.pointsAvailable);
  const pointsTotal = useRewardsStore((s) => s.pointsTotal);
  const streakDays = useRewardsStore((s) => s.streakDays);
  const hasCheckedInToday = useRewardsStore((s) => s.hasCheckedInToday);
  const ledger = useRewardsStore((s) => s.ledger);

  // Today’s routine (AM + PM) — recompute whenever steps change
  const todaysSteps = useMemo(
    () => [...stepsByPeriod("morning"), ...stepsByPeriod("evening")],
    [stepsByPeriod, stepsAll]
  );
  const totalToday = todaysSteps.length;
  const doneToday = todaysSteps.filter((s) => isCompletedToday(s.id)).length;

  // Weekly completion
  const weekStart = dayjs().startOf("week");
  const days = Array.from({ length: 7 }, (_, i) => weekStart.add(i, "day").format("YYYY-MM-DD"));
  const expectedTotal = todaysSteps.length * 7;
  const dailyIds = new Set(todaysSteps.map((s) => s.id));
  const actualTotal = days.reduce((acc, iso) => {
    const map = completedByDate[iso] || {};
    const completedIds = Object.keys(map).filter((id) => dailyIds.has(id)).length;
    return acc + completedIds;
  }, 0);
  const weeklyPct = expectedTotal > 0 ? Math.round((actualTotal / expectedTotal) * 100) : 0;

  // Total steps completed (all time)
  const totalStepsCompleted = useMemo(() => {
    return Object.values(completedByDate).reduce((acc, dayCompletions) => {
      return acc + Object.keys(dayCompletions).length;
    }, 0);
  }, [completedByDate]);

  // Rewards tier
  const tier = tierInfo(points);

  // Toggle handler (+1 daily check-in on first completion of the day)
  const [toast, setToast] = useState<string | null>(null);
  function onToggle(step: RoutineStep) {
    const nowCompleted = toggleStepToday(step.id);
    if (nowCompleted && !hasCheckedInToday()) {
      const res = onDailyCheckIn();
      if (res?.ok) {
        setToast(res.message);
        setTimeout(() => setToast(null), 1500);
      }
    }
  }

  // 14-day check-ins sparkline (from rewards ledger)
  const checkinsSet = useMemo(() => {
    const set = new Set<string>();
    ledger
      .filter((l) => l.reason === "daily_check_in")
      .forEach((l) => set.add(dayjs(l.ts).format("YYYY-MM-DD")));
    return set;
  }, [ledger]);
  const last14 = Array.from({ length: 14 }, (_, i) => dayjs().subtract(13 - i, "day"));
  const checkinBars = last14.map((d) => (checkinsSet.has(d.format("YYYY-MM-DD")) ? 1 : 0));

  return (
    <View style={{ flex: 1, backgroundColor: "#120d0a" }}>
      <ImageBackground
        source={require("../../assets/dashboard.png")}
        resizeMode="cover"
        style={StyleSheet.absoluteFillObject as any}
      />
      <StatusBar style="light" />

      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <ScreenScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 0 }}
          bottomExtra={16} // ✅ tab bar + safe-area + a little cushion (same convention)
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerWrap}>
            <Text style={styles.headerTitle}>Your Hair Journey</Text>
            <View style={styles.headerAction}>
              <RewardsPill compact />
            </View>
            <Text style={styles.headerSub}>Your routine, progress, and rewards in one place.</Text>
          </View>

          {/* Daily Hair Check-in */}
          {checkInVisible && (
            <View style={{ marginBottom: 14 }}>
              <DailyHairCheckIn onHidden={() => setCheckInVisible(false)} />
            </View>
          )}

          {/* Hair Health Journey */}
          <GlassCard style={{ padding: 14, marginBottom: 14 }}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.iconDot}>
                  <Feather name="trending-up" size={14} color="#fff" />
                </View>
                <Text style={styles.sectionHeaderText}>Hair Health Journey</Text>
              </View>
            </View>

            <RecoveryChart weeks={16} curve={{ plateauAt: 0.82 }} durationMs={18000} loop />

            <View style={{ marginTop: 10 }}>
              <Text style={styles.sparkTitle}>Daily check-ins (last 14 days)</Text>
              <View style={styles.sparkRow}>
                {checkinBars.map((v, i) => (
                  <View
                    key={i}
                    style={[
                      styles.sparkBar,
                      { opacity: v ? 1 : 0.35, height: v ? 16 : 8 },
                    ]}
                  />
                ))}
              </View>
            </View>
          </GlassCard>

          {/* Progress + Rewards snapshot (above Today's Routine) */}
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
            <GlassCard style={{ flex: 1, padding: 14, minHeight: 140 }}>
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.iconDot}>
                  <Feather name="activity" size={14} color="#fff" />
                </View>
                <Text style={styles.sectionHeaderText}>Your Progress</Text>
              </View>

              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                <StatTile big={String(streakDays)} caption="Streak" />
                <StatTile big={`${weeklyPct}%`} caption="This Week" />
              </View>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <StatTile big={String(totalStepsCompleted)} caption="Total Steps" />
                <StatTile big={String(pointsTotal)} caption="Points" />
              </View>
            </GlassCard>

            <GlassCard style={{ flex: 1, padding: 14, minHeight: 140 }}>
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.iconDot}>
                  <Feather name="gift" size={14} color="#fff" />
                </View>
                <Text style={styles.sectionHeaderText}>Rewards</Text>
              </View>

              <View
                style={{
                  marginTop: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View>
                  <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "600" }}>Points</Text>
                  <Text style={{ color: "#fff", fontSize: 28, fontWeight: "800", marginTop: 2 }}>
                    {points}
                  </Text>
                </View>
                <View style={styles.tierBadge}>
                  <Text style={styles.tierBadgeText}>{tier.currentLabel}</Text>
                </View>
              </View>

              <View style={{ marginTop: 10 }}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${tier.percent * 100}%` }]} />
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginTop: 6,
                  }}
                >
                  <Text style={styles.progressLeft}>To {tier.nextLabel}</Text>
                  <Text style={styles.progressRight}>{tier.remainingLabel}</Text>
                </View>
              </View>

              <Pressable
                onPress={() => router.push("/(app)/rewards")}
                style={[styles.linkRow, { marginTop: 10 }]}
              >
                <Text style={styles.linkText}>Open Rewards</Text>
                <Feather name="chevron-right" size={16} color="#fff" />
              </Pressable>
            </GlassCard>
          </View>

          {/* Today’s Routine (below) */}
          <GlassCard style={{ padding: 14, marginBottom: 14 }}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.iconDot}>
                  <Feather name="calendar" size={14} color="#fff" />
                </View>
                <Text style={styles.sectionHeaderText}>Today’s Routine</Text>
              </View>
              <View style={styles.counterPill}>
                <Text style={styles.counterPillText}>
                  {doneToday} of {totalToday} complete
                </Text>
              </View>
            </View>

            <View style={{ marginTop: 8, gap: 10 }}>
              {todaysSteps.map((s) => {
                const done = isCompletedToday(s.id);
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => onToggle(s)}
                    style={[styles.taskCard, done && styles.taskCardDone]}
                  >
                    <View style={styles.checkCircle}>
                      {done ? <Feather name="check" size={14} color="#fff" /> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.taskTitle}>{s.name}</Text>
                      {s.time ? <Text style={styles.taskTime}>{s.time}</Text> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Pressable onPress={() => router.push("/(app)/routine")} style={styles.longBtn}>
              <Text style={styles.longBtnText}>View Full Routine</Text>
            </Pressable>
          </GlassCard>

          {/* tiny toast */}
          {toast ? (
            <View style={styles.toast}>
              <Text style={styles.toastText}>{toast}</Text>
            </View>
          ) : null}
        </ScreenScrollView>
      </SafeAreaView>
    </View>
  );
}

/* -------------------------------- helpers/ui ------------------------------- */

function GlassCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[styles.glassCard, style]}>
      {children}
    </View>
  );
}

function StatTile({ big, caption }: { big: string; caption: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statBig}>{big}</Text>
      <Text style={styles.statCap}>{caption}</Text>
    </View>
  );
}

/* --------------------------------- styles --------------------------------- */

const styles = StyleSheet.create({
  // Header
  headerWrap: {
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    position: "relative",
    paddingTop: 24,
  },
  headerAction: { position: "absolute", right: 0, top: 8 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800", textAlign: "center" },
  headerSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 4, textAlign: "center" },

  axisLabel: { color: "rgba(255,255,255,0.7)", fontSize: 10 },

  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionHeaderLeft: { flexDirection: "row", alignItems: "center" },
  sectionHeaderText: { color: "#fff", fontWeight: "700" },
  iconDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    marginRight: 8,
  },

  glassCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  glassShadow: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
  },
  glassBody: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.08)" },

  // sparkline
  sparkTitle: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginBottom: 6, fontWeight: "600" },
  sparkRow: { flexDirection: "row", alignItems: "flex-end", gap: 4 },
  sparkBar: {
    width: 10,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },

  counterPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  counterPillText: { color: "#fff", fontWeight: "700", fontSize: 12 },

  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  taskCardDone: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.35)",
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  taskTitle: { color: "#fff", fontWeight: "700" },
  taskTime: { color: "rgba(255,255,255,0.80)", marginTop: 2 },

  longBtn: {
    marginTop: 12,
    alignItems: "center",
    borderRadius: 999,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.30)",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  longBtnText: { color: "#fff", fontWeight: "800" },

  statTile: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.08)",
    minHeight: 60,
  },
  statBig: { color: "#fff", fontSize: 22, fontWeight: "800" },
  statCap: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },

  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  tierBadgeText: { color: "#fff", fontWeight: "800", fontSize: 12 },

  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  progressFill: { height: 8, borderRadius: 999, backgroundColor: "#fff" },
  progressLeft: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "600" },
  progressRight: { color: "rgba(255,255,255,0.8)", fontSize: 12 },

  linkRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  linkText: { color: "#fff", textDecorationLine: "underline", fontWeight: "700" },

  toast: {
    marginTop: 12,
    alignSelf: "center",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  toastText: { color: "#fff", fontWeight: "700" },
});
