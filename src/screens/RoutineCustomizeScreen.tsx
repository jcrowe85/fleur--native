// src/screens/RoutineCustomizeScreen.tsx
import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Pressable,
  TextInput,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

import { useRoutineStore, RoutineStep, Period } from "@/state/routineStore";
import { useRecommendationsStore } from "@/state/recommendationsStore";

// ✅ Shared bottom spacing helper
import { ScreenScrollView } from "@/components/UI/bottom-space";
import RewardsPill from "@/components/UI/RewardsPill";

/* ---------------- helpers ---------------- */

function uid() {
  return Math.random().toString(36).slice(2, 8) + "-" + Date.now().toString(36);
}

const PERIODS: Period[] = ["morning", "evening", "weekly"];
const FREQ_CHOICES = ["Daily", "3x/week", "Weekly"] as const;

function stepIdentity(step: RoutineStep) {
  // use product name when present, else step name
  return (step.product || step.name || "").trim().toLowerCase();
}
function recIdentity(rec: any) {
  return (rec?.name || rec?.product || "").trim().toLowerCase();
}

/* ---------------- screen ---------------- */

export default function RoutineCustomizeScreen() {
  // Routine store
  const steps = useRoutineStore((s) => s.steps);
  const upsertStep = useRoutineStore((s) => s.upsertStep);
  const removeStep = useRoutineStore((s) => s.removeStep);
  const applyDefaultIfEmpty = useRoutineStore((s) => s.applyDefaultIfEmpty);

  // Recommendations
  const recs = useRecommendationsStore((s) => s.items);

  useEffect(() => {
    applyDefaultIfEmpty();
  }, [applyDefaultIfEmpty]);

  // --- Add/Edit form control ---
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<RoutineStep>>({
    name: "",
    product: "",
    period: "morning",
    frequency: "Daily",
    time: "",
    instructions: "",
    enabled: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function openAdd() {
    setEditingId(null);
    setForm({
      id: uid(),
      name: "",
      product: "",
      period: "morning",
      frequency: "Daily",
      time: "",
      instructions: "",
      enabled: true,
      icon: "droplet",
    });
    setError(null);
    setShowForm(true);
  }

  function openEdit(step: RoutineStep) {
    setEditingId(step.id);
    setForm({ ...step });
    setError(null);
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setError(null);
  }

  function saveForm() {
    const name = (form.name || "").trim();
    if (!name) {
      setError("Please enter a step name.");
      return;
    }
    const sanitized: RoutineStep = {
      id: form.id || uid(),
      name,
      product: (form.product || "").trim(),
      period: (form.period as Period) || "morning",
      frequency: (form.frequency as any) || "Daily",
      time: (form.time || "").trim(),
      instructions: (form.instructions || "").trim(),
      enabled: form.enabled ?? true,
      icon: form.icon || "droplet",
    };
    upsertStep(sanitized);
    setShowForm(false);
    setEditingId(null);
    setError(null);
    setToast(editingId ? "Step updated" : "Step added");
    setTimeout(() => setToast(null), 1100);
  }

  function onBack() {
    try {
      router.canGoBack() ? router.back() : router.replace("/(app)/routine");
    } catch {
      router.replace("/(app)/routine");
    }
  }

  // Recommended list excludes items already present in current steps (by name/product)
  const currentKeys = useMemo(() => new Set(steps.map(stepIdentity)), [steps]);
  const recommendedAvailable = useMemo(
    () => (recs || []).filter((r) => !currentKeys.has(recIdentity(r))),
    [recs, currentKeys]
  );

  function addFromRecommendation(rec: any) {
    const draft: RoutineStep = {
      id: uid(),
      name: rec?.name || "Custom Step",
      enabled: true,
      period: (rec?.period as Period) || "morning",
      frequency: rec?.frequency || "Daily",
      time: rec?.time || "",
      instructions: rec?.instructions || "",
      product: rec?.product || rec?.name || "",
      icon: rec?.icon || "droplet",
    };
    upsertStep(draft);
    setToast("Added to your steps");
    setTimeout(() => setToast(null), 1100);
  }

  /* --------------- UI --------------- */

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
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, position: "relative" }}>
            <Pressable onPress={onBack} hitSlop={10} style={[styles.backButton, { padding: 8, borderRadius: 20 }]}>
              <Feather name="arrow-left" size={18} color="#fff" />
            </Pressable>

            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={styles.headerTitle}>Customize Routine</Text>
              <Text style={styles.headerSub}>Add steps, set times, choose frequency</Text>
            </View>

            <View style={[styles.rewardsPillContainer, { padding: 8, borderRadius: 20 }]}>
              <RewardsPill compact />
            </View>
          </View>
        </View>

        <ScreenScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6 }}
          bottomExtra={24} // ✅ safe-area + tab bar + small cushion (matches your prior padding)
          showsVerticalScrollIndicator={false}
        >

          {/* Add Step trigger */}
          <Pressable onPress={openAdd} style={[styles.longBtn, styles.longBtnGhost]}>
            <Text style={styles.longBtnGhostText}>Add Step</Text>
          </Pressable>

          {/* Conditional form (appears only when adding/editing) */}
          {showForm && (
            <View style={[styles.card, { marginTop: 10 }]}>
              <View style={styles.formHeader}>
                <Text style={styles.sectionTitle}>{editingId ? "Edit step" : "New step"}</Text>
                <Pressable onPress={cancelForm} hitSlop={8} style={styles.iconBtn}>
                  <Feather name="x" size={16} color="rgba(255,255,255,0.95)" />
                </Pressable>
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Text style={styles.label}>Step name</Text>
              <TextInput
                value={form.name ?? ""}
                onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
                placeholder="e.g., Peptide Growth Serum"
                placeholderTextColor="rgba(255,255,255,0.55)"
                style={styles.input}
              />

              <Text style={styles.label}>Product (optional)</Text>
              <TextInput
                value={form.product ?? ""}
                onChangeText={(t) => setForm((f) => ({ ...f, product: t }))}
                placeholder="e.g., Fleur Growth Complex"
                placeholderTextColor="rgba(255,255,255,0.55)"
                style={styles.input}
              />

              <Text style={styles.label}>Period</Text>
              <View style={styles.chipsRow}>
                {PERIODS.map((p) => {
                  const active = (form.period as Period) === p;
                  return (
                    <Pressable
                      key={p}
                      onPress={() => setForm((f) => ({ ...f, period: p }))}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {p === "morning" ? "Morning" : p === "evening" ? "Evening" : "Weekly"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>Frequency</Text>
              <View style={styles.chipsRow}>
                {FREQ_CHOICES.map((f) => {
                  const active = (form.frequency as any) === f;
                  return (
                    <Pressable
                      key={f}
                      onPress={() => setForm((prev) => ({ ...prev, frequency: f }))}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{f}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>Time</Text>
              <TextInput
                value={form.time ?? ""}
                onChangeText={(t) => setForm((f) => ({ ...f, time: t }))}
                placeholder="e.g., 8:00 AM"
                placeholderTextColor="rgba(255,255,255,0.55)"
                style={styles.input}
              />

              <Text style={styles.label}>Instructions (optional)</Text>
              <TextInput
                value={form.instructions ?? ""}
                onChangeText={(t) => setForm((f) => ({ ...f, instructions: t }))}
                placeholder="e.g., Apply 3–4 drops to clean scalp"
                placeholderTextColor="rgba(255,255,255,0.55)"
                style={[styles.input, { minHeight: 60, textAlignVertical: "top", paddingTop: 10 }]}
                multiline
              />

              {/* Action row — prevents squashing */}
              <View style={styles.actionRow}>
  <Pressable
    onPress={cancelForm}
    style={[styles.longBtn, styles.longBtnGhost, styles.formBtn]}
  >
    <Text style={styles.longBtnGhostText}>Cancel</Text>
  </Pressable>

  <Pressable
    onPress={saveForm}
    style={[styles.longBtn, styles.longBtnPrimary, styles.formBtn]}
  >
    <Text style={styles.longBtnPrimaryText}>{editingId ? "Save" : "Add"}</Text>
  </Pressable>
</View>
            </View>
          )}

          {/* Current steps */}
          <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Your steps</Text>
          <View style={{ gap: 10 }}>
            {steps.length === 0 ? (
              <View style={[styles.card, { alignItems: "center" }]}>
                <Text style={styles.infoText}>No steps yet. Tap “Add Step” to create one.</Text>
              </View>
            ) : (
              steps.map((step) => (
                <View key={step.id} style={styles.card}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.stepTitle}>{step.name}</Text>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      <Pressable onPress={() => openEdit(step)} hitSlop={10} style={styles.iconOnlyBtn}>
                        <Feather name="edit-2" size={16} color="#fff" />
                      </Pressable>
                      <Pressable onPress={() => removeStep(step.id)} hitSlop={10} style={styles.iconOnlyBtn}>
                        <Feather name="trash-2" size={16} color="#fff" />
                      </Pressable>
                    </View>
                  </View>

                  {step.instructions ? <Text style={styles.stepDesc}>{step.instructions}</Text> : null}

                  <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {step.time ? (
                      <View style={styles.pill}>
                        <Feather name="clock" size={12} color="#fff" />
                        <Text style={styles.pillText}>{step.time}</Text>
                      </View>
                    ) : null}
                    <View style={styles.pill}>
                      <Text style={styles.pillText}>{step.frequency || "Daily"}</Text>
                    </View>
                    <View style={styles.pill}>
                      <Text style={styles.pillText}>
                        {step.period === "evening" ? "Evening" : step.period === "weekly" ? "Weekly" : "Morning"}
                      </Text>
                    </View>
                    {step.product ? (
                      <View style={styles.pill}>
                        <Text style={styles.pillText}>{step.product}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Recommended section */}
          <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Recommended for you</Text>
          <View style={{ gap: 10 }}>
            {recommendedAvailable.length === 0 ? (
              <View style={[styles.card, { alignItems: "center" }]}>
                <Text style={styles.infoText}>No recommendations available.</Text>
              </View>
            ) : (
              recommendedAvailable.map((rec, idx) => (
                <View key={`${rec?.id ?? idx}`} style={styles.card}>
                  <Text style={styles.stepTitle}>{rec?.name || "Recommended Step"}</Text>
                  {rec?.description ? <Text style={styles.stepDesc}>{rec.description}</Text> : null}

                  <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {rec?.time ? (
                      <View style={styles.pill}>
                        <Feather name="clock" size={12} color="#fff" />
                        <Text style={styles.pillText}>{rec.time}</Text>
                      </View>
                    ) : null}
                    <View style={styles.pill}>
                      <Text style={styles.pillText}>{rec?.frequency || "Daily"}</Text>
                    </View>
                    <View style={styles.pill}>
                      <Text style={styles.pillText}>
                        {(rec?.period as Period) === "evening"
                          ? "Evening"
                          : (rec?.period as Period) === "weekly"
                          ? "Weekly"
                          : "Morning"}
                      </Text>
                    </View>
                  </View>

                  <Pressable onPress={() => addFromRecommendation(rec)} style={[styles.longBtn, styles.longBtnPrimary]}>
                    <Text style={styles.longBtnPrimaryText}>Add to steps</Text>
                  </Pressable>
                </View>
              ))
            )}
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

/* ---------------- styles ---------------- */

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
  backButton: {
    position: "absolute",
    left: 16,
    top: -8,
  },
  rewardsPillContainer: {
    position: "absolute",
    right: 16,
    top: -24,
  },

  sectionTitle: {
    marginTop: 6,
    marginBottom: 8,
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: 12,
  },

  infoText: { color: "rgba(255,255,255,0.85)", textAlign: "center" },
  formBtn: {
    height: 44,                 // exact height match
    marginTop: 0,               // overrides longBtnPrimary's marginTop in this row
    paddingVertical: 0,         // kill vertical padding
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  longBtn: {
    borderRadius: 999,
    minHeight: 44,                 // uniform pill height
    paddingHorizontal: 16,         // horizontal space
    paddingVertical: 0,            // we'll center with height instead
    alignItems: "center",
    justifyContent: "center",      // centers the label vertically
    borderWidth: 1,
    overflow: Platform.OS === "android" ? "hidden" : undefined, // nicer ripple clip
  },
  longBtnGhost: {
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.08)",
    minHeight: 44,
  },

  longBtnPrimary: { backgroundColor: "#fff", borderColor: "#fff", marginTop: 10 },
  longBtnGhostText: {
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  longBtnPrimaryText: {
    color: "#000",
    fontWeight: "800",
    textAlign: "center",
    includeFontPadding: false,
    textAlignVertical: "center",
  },

  /* form */
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  errorText: { color: "#ffb4b4", marginBottom: 6 },

  label: { color: "rgba(255,255,255,0.8)", fontWeight: "700", marginTop: 6, marginBottom: 6 },

  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 12,
    paddingVertical: Platform.select({ ios: 10, android: 8 }) as number,
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  chipActive: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderColor: "rgba(255,255,255,0.85)",
  },
  chipText: { color: "#fff", fontWeight: "700" },
  chipTextActive: { color: "#000", fontWeight: "800" },

  /* current items */
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  stepTitle: { color: "#fff", fontWeight: "800" },
  stepDesc: { color: "rgba(255,255,255,0.8)", marginTop: 6 },

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

  /* icon-only actions */
  iconOnlyBtn: {
    padding: 8,
    borderRadius: 999,
  },

  /* form action row */
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 10,
  },
  actionBtn: {
    flexShrink: 0,
    minWidth: 100,
    minHeight: 44,           // enforce pill height consistency
    paddingHorizontal: 16,   // horizontal space only
    alignItems: "center",
    justifyContent: "center",
  },

  /* toast */
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
});
