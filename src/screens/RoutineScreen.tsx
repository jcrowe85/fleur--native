// src/screens/RoutineScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import dayjs from "dayjs";
import { router } from "expo-router";

import { useRoutineStore, RoutineStep, Period } from "@/state/routineStore";
import { onDailyCheckIn, onRoutineStarted } from "@/services/rewards";
import { useRewardsStore } from "@/state/rewardsStore";

// ✨ Add the compact Rewards pill like Community
import RewardsPill from "@/components/UI/RewardsPill";

type TimerState = {
  active: boolean;
  seconds: number;
};

/* --------------------- helpers (weekly) --------------------- */

function next7Days() {
  const out: { iso: string; label: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = dayjs().add(i, "day");
    out.push({
      iso: d.format("YYYY-MM-DD"),
      label: `${d.format("ddd")} • ${d.format("MMM D")}`,
    });
  }
  return out;
}

function StepRowWeekly({
  step,
  dateISO,
  onToggle,
  isDone,
}: {
  step: RoutineStep;
  dateISO: string;
  onToggle: (id: string, iso: string) => void;
  isDone: (id: string, iso: string) => boolean;
}) {
  const completed = isDone(step.id, dateISO);
  return (
    <Pressable onPress={() => onToggle(step.id, dateISO)} style={[styles.card, completed && styles.cardDone]}>
      <View style={styles.leftCheck}>
        <View style={[styles.checkCircle, completed && styles.checkCircleOn]}>
          {completed ? <Feather name="check" size={16} color="#fff" /> : null}
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.stepTitle}>
          {step.name} {completed ? <Text style={styles.stepComplete}>✓ Complete</Text> : null}
        </Text>

        {step.instructions ? <Text style={styles.stepDesc}>{step.instructions}</Text> : null}

        <View style={styles.metaRow}>
          <View style={styles.pill}>
            <Feather name="clock" size={12} color="#fff" />
            <Text style={styles.pillText}>{step.time || "—"}</Text>
          </View>
          {step.frequency ? (
            <View style={[styles.pill, { marginLeft: 8 }]}>
              <Text style={styles.pillText}>{step.frequency}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

/* --------------------- screen --------------------- */

export default function RoutineScreen() {
  const insets = useSafeAreaInsets();

  // routine store
  const applyDefaultIfEmpty = useRoutineStore((s) => s.applyDefaultIfEmpty);
  const stepsByPeriod = useRoutineStore((s) => s.stepsByPeriod);
  const isCompletedToday = useRoutineStore((s) => s.isCompletedToday);
  const toggleStepToday = useRoutineStore((s) => s.toggleStepToday);
  const stepsAll = useRoutineStore((s) => s.steps);

  // subscribe to completion map so weekly view re-renders on toggle
  const completedByDate = useRoutineStore((s) => s.completedByDate);

  // access per-day toggle/check helpers for weekly view
  const toggleStepOn = useRoutineStore((s) => s.toggleStepOn);
  const isCompletedOn = useRoutineStore((s) => s.isCompletedOn);

  // rewards
  const hasCheckedInToday = useRewardsStore((s) => s.hasCheckedInToday);

  // initialize default routine & grant "startedRoutine" once
  useEffect(() => {
    applyDefaultIfEmpty();
  }, [applyDefaultIfEmpty]);

  useEffect(() => {
    if (stepsAll.some((s) => s.enabled)) {
      onRoutineStarted();
    }
  }, [stepsAll]);

  const [tab, setTab] = useState<Period>("morning");

  // timers (per tab)
  const [timer, setTimer] = useState<Record<Period, TimerState>>({
    morning: { active: false, seconds: 0 },
    evening: { active: false, seconds: 0 },
    weekly: { active: false, seconds: 0 },
  });
  const intervalRef = useRef<Record<Period, ReturnType<typeof setInterval> | null>>({
    morning: null,
    evening: null,
    weekly: null,
  });

  // recompute the list when steps or completion map changes
  const list = useMemo(() => stepsByPeriod(tab), [stepsByPeriod, tab, stepsAll, completedByDate]);

  // split into active vs completed (for Morning/Evening)
  const { activeList, completedList } = useMemo(() => {
    if (tab === "weekly") {
      return { activeList: list, completedList: [] as RoutineStep[] };
    }
    const done = list.filter((s) => isCompletedToday(s.id));
    const active = list.filter((s) => !isCompletedToday(s.id));
    return { activeList: active, completedList: done };
  }, [list, tab, isCompletedToday]);

  function startPauseTimer(p: Period) {
    setTimer((prev) => {
      const t = prev[p];
      const next = { ...prev };
      if (t.active) {
        if (intervalRef.current[p]) {
          clearInterval(intervalRef.current[p]!);
          intervalRef.current[p] = null;
        }
        next[p] = { ...t, active: false };
      } else {
        intervalRef.current[p] = setInterval(() => {
          setTimer((pv) => ({ ...pv, [p]: { ...pv[p], seconds: pv[p].seconds + 1 } }));
        }, 1000);
        next[p] = { ...t, active: true };
      }
      return next;
    });
  }

  function resetTimer(p: Period) {
    if (intervalRef.current[p]) {
      clearInterval(intervalRef.current[p]!);
      intervalRef.current[p] = null;
    }
    setTimer((prev) => ({ ...prev, [p]: { active: false, seconds: 0 } }));
  }

  useEffect(() => {
    return () => {
      (Object.keys(intervalRef.current) as Period[]).forEach((k) => {
        if (intervalRef.current[k]) clearInterval(intervalRef.current[k]!);
      });
    };
  }, []);

  function fmt(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  const [toast, setToast] = useState<string | null>(null);

  async function onToggleDaily(step: RoutineStep) {
    const nowCompleted = toggleStepToday(step.id);

    // If this was the first completion today, trigger +1 check-in
    if (nowCompleted && !hasCheckedInToday()) {
      const res = onDailyCheckIn(); // { ok, message }
      if (res?.ok) {
        setToast(res.message);
        setTimeout(() => setToast(null), 1800);
      }
    }
  }

  function headerCounts(period: Period) {
    const items = stepsByPeriod(period);
    const done = items.filter((s) => isCompletedToday(s.id)).length;
    return `${done}/${items.length}`;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#120d0a" }}>
      <ImageBackground
        source={require("../../assets/dashboard.png")}
        resizeMode="cover"
        style={StyleSheet.absoluteFillObject as any}
      />
      <StatusBar style="light" />

      <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header matches Community: centered title + compact pill in top-right */}
          <View style={styles.headerWrap}>
            {/* absolute pill hugs the padded right edge (content padding is 16) */}
            <View style={styles.headerAction}>
              <RewardsPill compact />
            </View>

            <Text style={styles.headerTitle}>Your Hair Routine</Text>
            <Text style={styles.headerSub}>Personalized for your hair goals</Text>
          </View>

          {/* Tabs */}
          <View style={styles.tabsRow}>
            {(["morning", "evening", "weekly"] as Period[]).map((p) => {
              const active = tab === p;
              const label = p === "morning" ? "Morning" : p === "evening" ? "Evening" : "Weekly";
              return (
                <Pressable key={p} onPress={() => setTab(p)} style={[styles.tabBtn, active && styles.tabBtnActive]}>
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Daily tabs (morning/evening) */}
          {tab !== "weekly" ? (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {tab === "morning" ? "Morning Routine" : "Evening Routine"}{" "}
                  <Text style={styles.smallCount}>({headerCounts(tab)})</Text>
                </Text>

                <View style={styles.timerRow}>
                  {timer[tab].seconds > 0 && <Text style={styles.timerText}>{fmt(timer[tab].seconds)}</Text>}
                  <Pressable onPress={() => startPauseTimer(tab)} style={styles.timerBtn}>
                    <Feather name={timer[tab].active ? "pause" : "play"} size={14} color="#fff" />
                    <Text style={styles.timerBtnText}>{timer[tab].active ? "Pause" : "Start Timer"}</Text>
                  </Pressable>
                  {timer[tab].seconds > 0 && (
                    <Pressable onPress={() => resetTimer(tab)} style={[styles.timerBtn, { marginLeft: 6 }]}>
                      <Feather name="square" size={14} color="#fff" />
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Active tasks */}
              <View style={{ gap: 10 }}>
                {activeList.map((step) => {
                  const completed = isCompletedToday(step.id);
                  return (
                    <Pressable
                      key={step.id}
                      onPress={() => onToggleDaily(step)}
                      style={[styles.card, completed && styles.cardDone]}
                    >
                      <View style={styles.leftCheck}>
                        <View style={[styles.checkCircle, completed && styles.checkCircleOn]}>
                          {completed ? <Feather name="check" size={16} color="#fff" /> : null}
                        </View>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.stepTitle}>
                          {step.name} {completed ? <Text style={styles.stepComplete}>✓ Complete</Text> : null}
                        </Text>

                        <Text style={styles.stepDesc}>
                          {step.instructions || "Follow the instructions shown for best results."}
                        </Text>

                        <View style={styles.metaRow}>
                          <View style={styles.pill}>
                            <Feather name="clock" size={12} color="#fff" />
                            <Text style={styles.pillText}>{step.time || "—"}</Text>
                          </View>

                          <View style={[styles.pill, { marginLeft: 8 }]}>
                            <Text style={styles.pillText}>{step.frequency || "Daily"}</Text>
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* Completed today */}
              {completedList.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.completedHeader}>Completed today</Text>
                  <View style={{ gap: 10 }}>
                    {completedList.map((step) => (
                      <Pressable
                        key={`done-${step.id}`}
                        onPress={() => onToggleDaily(step)}
                        style={[styles.card, styles.cardDone, styles.cardCompletedDim]}
                      >
                        <View style={styles.leftCheck}>
                          <View style={[styles.checkCircle, styles.checkCircleOn]}>
                            <Feather name="check" size={16} color="#fff" />
                          </View>
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={styles.stepTitle}>
                            {step.name} <Text style={styles.stepComplete}>✓ Complete</Text>
                          </Text>

                          <Text style={styles.stepDesc}>
                            {step.instructions || "Follow the instructions shown for best results."}
                          </Text>

                          <View style={styles.metaRow}>
                            <View style={styles.pill}>
                              <Feather name="clock" size={12} color="#fff" />
                              <Text style={styles.pillText}>{step.time || "—"}</Text>
                            </View>

                            <View style={[styles.pill, { marginLeft: 8 }]}>
                              <Text style={styles.pillText}>{step.frequency || "Daily"}</Text>
                            </View>
                          </View>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </>
          ) : (
            /* Weekly tab */
            <View style={{ gap: 12 }}>
              {next7Days().map((d) => {
                const dailyStepsAll = [
                  ...useRoutineStore.getState().stepsByPeriod("morning"),
                  ...useRoutineStore.getState().stepsByPeriod("evening"),
                ];
                const weeklyStepsOnly = useRoutineStore.getState().stepsByPeriod("weekly");

                const doneCount = dailyStepsAll.filter((s) => isCompletedOn(s.id, d.iso)).length;

                return (
                  <View key={d.iso} style={styles.dayCard}>
                    <View style={styles.dayHeader}>
                      <Text style={styles.dayTitle}>{d.label}</Text>
                      <Text style={styles.dayCount}>
                        {doneCount}/{dailyStepsAll.length}
                      </Text>
                    </View>

                    {/* Daily steps for that specific date */}
                    {dailyStepsAll.length > 0 ? (
                      <View style={{ gap: 8 }}>
                        {dailyStepsAll.map((step) => (
                          <StepRowWeekly
                            key={`${d.iso}-${step.id}`}
                            step={step}
                            dateISO={d.iso}
                            onToggle={toggleStepOn}
                            isDone={isCompletedOn}
                          />
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.infoEmpty}>No daily steps configured.</Text>
                    )}

                    <View style={styles.weeklyDivider} />

                    {/* Weekly-only steps */}
                    {weeklyStepsOnly.length > 0 ? (
                      <View style={{ gap: 8 }}>
                        <Text style={styles.sectionSubhead}>Weekly steps</Text>
                        {weeklyStepsOnly.map((step) => (
                          <StepRowWeekly
                            key={`${d.iso}-w-${step.id}`}
                            step={step}
                            dateISO={d.iso}
                            onToggle={toggleStepOn}
                            isDone={isCompletedOn}
                          />
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.infoEmpty}>
                        No weekly steps configured. Add weekly treatments in Customize.
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Quick actions */}
          <View style={{ marginTop: 14, gap: 10 }}>
            <Pressable onPress={() => router.push("/(app)/routine/customize")} style={[styles.longBtn, styles.longBtnGhost]}>
              <Text style={styles.longBtnGhostText}>Customize Routine</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/(app)/routine-analytics")} style={[styles.longBtn, styles.longBtnGhost]}>
              <Text style={styles.longBtnGhostText}>View Progress Analytics</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* tiny toast */}
      {toast ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </View>
  );
}

/* ================== styles ================== */

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: 16,
    // top padding set inline with insets
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    position: "relative",
    paddingTop: 24,
  },
  headerAction: {
    position: "absolute",
    right: 0, // as far right as we can within the page gutter
    top: 8,    // small nudge down from the top of the header block
  },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800", textAlign: "center" },
  headerSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 4, textAlign: "center" },

  tabsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  tabBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.10)",
    paddingVertical: 10,
    alignItems: "center",
  },
  tabBtnActive: { backgroundColor: "rgba(255,255,255,0.85)" },
  tabText: { color: "#fff", fontWeight: "700" },
  tabTextActive: { color: "#000", fontWeight: "800" },

  sectionHeader: {
    marginTop: 6,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { color: "#fff", fontWeight: "800", fontSize: 16 },
  smallCount: { color: "rgba(255,255,255,0.75)", fontSize: 12 },

  timerRow: { flexDirection: "row", alignItems: "center" },
  timerText: {
    color: "#fff",
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
    marginRight: 8,
  },
  timerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  timerBtnText: { color: "#fff", fontWeight: "700" },

  card: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: 12,
    alignItems: "flex-start",
  },
  cardDone: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.35)",
  },
  cardCompletedDim: { opacity: 0.55 },

  leftCheck: { paddingTop: 2 },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  checkCircleOn: { backgroundColor: "rgba(255,255,255,0.18)" },

  stepTitle: { color: "#fff", fontWeight: "700" },
  stepComplete: { color: "rgba(255,255,255,0.85)", fontWeight: "400", fontSize: 12 },

  stepDesc: { color: "rgba(255,255,255,0.8)", marginTop: 6 },

  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  pillText: { color: "#fff", fontWeight: "700", fontSize: 12 },

  completedHeader: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "800",
    fontSize: 13,
    marginBottom: 6,
    marginTop: 2,
  },

  longBtn: {
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  longBtnGhost: {
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  longBtnGhostText: { color: "#fff", fontWeight: "700" },

  toast: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
  },
  toastText: { color: "#fff", fontWeight: "700" },

  /* weekly view */
  dayCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.06)",
    padding: 12,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  dayTitle: { color: "#fff", fontWeight: "800", fontSize: 14 },
  dayCount: { color: "rgba(255,255,255,0.8)", fontWeight: "700" },

  sectionSubhead: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "800",
    marginBottom: 6,
    marginTop: 2,
  },
  weeklyDivider: { height: 8 },
  infoEmpty: {
    color: "rgba(255,255,255,0.8)",
    lineHeight: 18,
    marginTop: 4,
    flexShrink: 1,
  },
});
