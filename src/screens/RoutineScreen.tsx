// src/screens/RoutineScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Pressable,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import dayjs from "dayjs";
import { router } from "expo-router";

import { useRoutineStore, RoutineStep, Period } from "@/state/routineStore";
import { onRoutineTaskCompleted, onRoutineTaskUndone } from "@/services/rewards";
import { useRewardsStore } from "@/state/rewardsStore";
import { usePlanStore } from "@/state/planStore";

// spacing helper (same convention as Community/Dashboard/Education)
import { ScreenScrollView } from "@/components/UI/bottom-space";

// ✨ Add the compact Rewards pill like Community
import RewardsPill from "@/components/UI/RewardsPill";


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
  // routine store
  const applyDefaultIfEmpty = useRoutineStore((s) => s.applyDefaultIfEmpty);
  const buildFromPlan = useRoutineStore((s) => s.buildFromPlan);
  const stepsByPeriod = useRoutineStore((s) => s.stepsByPeriod);
  const isCompletedToday = useRoutineStore((s) => s.isCompletedToday);
  const toggleStepToday = useRoutineStore((s) => s.toggleStepToday);
  const stepsAll = useRoutineStore((s) => s.steps);
  const completedByDate = useRoutineStore((s) => s.completedByDate);
  const toggleStepOn = useRoutineStore((s) => s.toggleStepOn);
  const isCompletedOn = useRoutineStore((s) => s.isCompletedOn);
  const hasSeenScheduleIntro = useRoutineStore((s) => s.hasSeenScheduleIntro);
  
  // Get user's personalized plan
  const { plan } = usePlanStore();

  // rewards (daily check-in is handled separately)

  // initialize routine from user's personalized plan
  useEffect(() => {
    if (plan && plan.recommendations && plan.recommendations.length > 0) {
      // Build routine from user's personalized recommendations
      buildFromPlan(plan);
    } else {
      // Fallback to default routine if no personalized plan
      applyDefaultIfEmpty();
    }
  }, [plan, buildFromPlan, applyDefaultIfEmpty]);

  const [tab, setTab] = useState<Period>("morning");

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



  const [toast, setToast] = useState<string | null>(null);

  async function onToggleDaily(step: RoutineStep) {
    const wasCompleted = isCompletedToday(step.id);
    const nowCompleted = toggleStepToday(step.id);

    if (nowCompleted && !wasCompleted) {
      // Task was just completed - award points
      const res = onRoutineTaskCompleted(step.id);
      if (res?.ok) {
        setToast(res.message);
        setTimeout(() => setToast(null), 3000);
      }
    } else if (!nowCompleted && wasCompleted) {
      // Task was just undone - remove points
      const res = onRoutineTaskUndone(step.id);
      if (res?.ok) {
        setToast(res.message);
        setTimeout(() => setToast(null), 3000);
      }
    }

    // Daily check-in is handled separately through the DailyHairCheckIn form component
  }

  async function onToggleWeekly(step: RoutineStep, dateISO: string) {
    const wasCompleted = isCompletedOn(step.id, dateISO);
    const nowCompleted = toggleStepOn(step.id, dateISO);

    // Only award points for today's date to prevent gaming
    const today = dayjs().format("YYYY-MM-DD");
    const isToday = dateISO === today;

    if (nowCompleted && !wasCompleted) {
      // Task was just completed
      if (isToday) {
        // Only award points for today's tasks
        const res = onRoutineTaskCompleted(step.id);
        if (res?.ok) {
          setToast(res.message);
          setTimeout(() => setToast(null), 3000);
        }
      } else {
        // Future/past dates - no points, just show completion
        setToast("Task completed for " + dayjs(dateISO).format("MMM D"));
        setTimeout(() => setToast(null), 2000);
      }
    } else if (!nowCompleted && wasCompleted) {
      // Task was just undone
      if (isToday) {
        // Only remove points for today's tasks
        const res = onRoutineTaskUndone(step.id);
        if (res?.ok) {
          setToast(res.message);
          setTimeout(() => setToast(null), 3000);
        }
      } else {
        // Future/past dates - no point changes, just show undo
        setToast("Task undone for " + dayjs(dateISO).format("MMM D"));
        setTimeout(() => setToast(null), 2000);
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
        {/* Header */}
        <View style={styles.headerWrap}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 16, position: "relative" }}>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={styles.headerTitle}>Your Hair Routine</Text>
              <Text style={styles.headerSub}>Personalized for your hair goals</Text>
            </View>

            <View style={[styles.rewardsPillContainer, { padding: 8, borderRadius: 20 }]}>
              <RewardsPill compact />
            </View>
          </View>
        </View>

        <ScreenScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6 }}
          bottomExtra={20} // ✅ safe-area + tab bar + small cushion (matches your convention)
          showsVerticalScrollIndicator={false}
        >

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

                <View style={styles.headerActions}>
                  <Pressable
                    onPress={() => {
                      if (!hasSeenScheduleIntro) {
                        router.push("/schedule-intro");
                      } else {
                        router.push("/schedule-routine");
                      }
                    }}
                    style={styles.timerBtn}
                  >
                    <Feather name="calendar" size={14} color="white" />
                    <Text style={styles.timerBtnText}>Schedule</Text>
                  </Pressable>
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
                      
                      <View style={styles.pointIndicator}>
                        <Text style={styles.pointText}>+1</Text>
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
                            onToggle={(id, iso) => onToggleWeekly(step, iso)}
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
                            onToggle={(id, iso) => onToggleWeekly(step, iso)}
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
        </ScreenScrollView>
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
  // Match Rewards header
  headerWrap: {
    paddingTop: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "600", textAlign: "center" },
  headerSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 4, textAlign: "center" },
  rewardsPillContainer: {
    position: "absolute",
    right: 16,
    top: -24,
  },

  tabsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: { color: "#fff", fontWeight: "800", fontSize: 16 },
  smallCount: { color: "rgba(255,255,255,0.75)", fontSize: 12 },
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
  pointIndicator: {
  },
  pointText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

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
