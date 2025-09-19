// src/features/routine/ScheduleEditor.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { RoutineStep, Frequency } from "@/state/routineStore";

type Props = {
  draft: RoutineStep[];
  onChange: (next: RoutineStep[]) => void;
  onBack: () => void;
  onSave: () => void;
};

function setForAll(steps: RoutineStep[], patch: Partial<RoutineStep>) {
  return steps.map((s) => ({ ...s, ...patch }));
}

function defaultDaysForFrequency(freq?: Frequency): number[] | undefined {
  if (!freq || freq === "Daily") return [0,1,2,3,4,5,6];
  if (freq === "Weekly") return [1];
  if (freq === "3x/week") return [1,3,5];
  return undefined;
}

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

export default function ScheduleEditor({ draft, onChange, onBack, onSave }: Props) {
  // Bulk state (only UI reflection; we just apply directly on press)
  const [timeModalOpen, setTimeModalOpen] = useState(false);
  const [timeInput, setTimeInput] = useState("8:00 AM");

  function applyBulkPeriod(p: "morning" | "evening") {
    onChange(setForAll(draft, { period: p, time: p === "evening" ? "8:00 PM" : "8:00 AM" }));
  }

  function applyBulkTime() {
    onChange(setForAll(draft, { time: timeInput }));
    setTimeModalOpen(false);
  }

  function applyBulkFrequency(freq: Frequency) {
    onChange(setForAll(draft, { frequency: freq, days: defaultDaysForFrequency(freq) }));
  }

  function toggleDayForStep(stepId: string, dayIndex: number) {
    const next = draft.map((s) => {
      if (s.id !== stepId) return s;
      const base = s.days ?? defaultDaysForFrequency(s.frequency) ?? [];
      const has = base.includes(dayIndex);
      const updated = has ? base.filter((d) => d !== dayIndex) : [...base, dayIndex];
      return { ...s, days: updated.sort((a, b) => a - b) };
    });
    onChange(next);
  }

  function setStepField(id: string, patch: Partial<RoutineStep>) {
    onChange(draft.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  return (
    <View>
      {/* Bulk controls */}
      <Text style={styles.sectionTitle}>Apply to all</Text>
      <View style={styles.bulkRow}>
        {/* Period */}
        <View style={styles.bulkGroup}>
          <Text style={styles.bulkLabel}>Period</Text>
          <View style={styles.row}>
            {(["morning", "evening"] as const).map((p) => (
              <Pressable key={p} onPress={() => applyBulkPeriod(p)} style={styles.chip}>
                <Text style={styles.chipText}>{p === "morning" ? "Morning" : "Evening"}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Time */}
        <View style={styles.bulkGroup}>
          <Text style={styles.bulkLabel}>Time</Text>
          <Pressable onPress={() => setTimeModalOpen(true)} style={styles.chip}>
            <Feather name="clock" size={14} color="#fff" />
            <Text style={styles.chipText}>Set time…</Text>
          </Pressable>
        </View>

        {/* Frequency */}
        <View style={styles.bulkGroup}>
          <Text style={styles.bulkLabel}>Frequency</Text>
          <View style={styles.row}>
            {(["Daily", "3x/week", "Weekly"] as Frequency[]).map((f) => (
              <Pressable key={f} onPress={() => applyBulkFrequency(f)} style={styles.chip}>
                <Text style={styles.chipText}>{f}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* Per-step editors */}
      <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Per-step overrides</Text>
      <View style={{ gap: 8 }}>
        {draft.map((s) => {
          const freq = s.frequency ?? "Daily";
          const period = s.period ?? "morning";
          const days = s.days ?? defaultDaysForFrequency(freq) ?? [];

          return (
            <View key={s.id} style={styles.card}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={styles.iconBubble}>
                  <Feather name={(s.icon as any) || "droplet"} size={16} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{s.name}</Text>
                  {!!s.instructions && <Text style={styles.sub}>{s.instructions}</Text>}
                </View>
              </View>

              {/* period + time */}
              <View style={[styles.row, { marginTop: 10 }]}>
                {(["morning", "evening"] as const).map((p) => {
                  const active = period === p;
                  return (
                    <Pressable
                      key={p}
                      onPress={() => setStepField(s.id, { period: p, time: p === "evening" ? "8:00 PM" : "8:00 AM" })}
                      style={[styles.chip, active && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextOn]}>
                        {p === "morning" ? "Morning" : "Evening"}
                      </Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  onPress={() => setStepField(s.id, { time: period === "evening" ? "8:00 PM" : "8:00 AM" })}
                  style={styles.chip}
                >
                  <Feather name="clock" size={14} color="#fff" />
                  <Text style={styles.chipText}>{s.time || "Set time"}</Text>
                </Pressable>
              </View>

              {/* frequency */}
              <View style={[styles.row, { marginTop: 8 }]}>
                {(["Daily", "3x/week", "Weekly", "Custom"] as Frequency[]).map((f) => {
                  const active = freq === f;
                  return (
                    <Pressable
                      key={f}
                      onPress={() => setStepField(s.id, { frequency: f, days: defaultDaysForFrequency(f) })}
                      style={[styles.chip, active && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextOn]}>{f}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* days (shown for 3x/week, Weekly, Custom) */}
              {freq !== "Daily" && (
                <View style={[styles.row, { marginTop: 8, flexWrap: "wrap", gap: 8 }]}>
                  {DAYS.map((lbl, idx) => {
                    const on = days.includes(idx);
                    return (
                      <Pressable
                        key={`${s.id}-d-${idx}`}
                        onPress={() => toggleDayForStep(s.id, idx)}
                        style={[styles.dayChip, on && styles.dayChipOn]}
                      >
                        <Text style={[styles.dayChipText, on && styles.dayChipTextOn]}>{lbl}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Footer actions */}
      <View style={{ flexDirection: "row", justifyContent: "flex-end", columnGap: 10, marginTop: 14 }}>
        <Pressable onPress={onBack} style={[styles.smallBtn, styles.btnGhost]}>
          <Text style={styles.btnGhostText}>Back</Text>
        </Pressable>
        <Pressable onPress={onSave} style={[styles.smallBtn, styles.btnPrimary]}>
          <Text style={styles.btnPrimaryText}>Save routine</Text>
        </Pressable>
      </View>

      {/* time modal (bulk) */}
      <Modal transparent visible={timeModalOpen} animationType="fade" onRequestClose={() => setTimeModalOpen(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Set time for all steps</Text>
            <TextInput
              value={timeInput}
              onChangeText={setTimeInput}
              placeholder="e.g., 8:00 AM"
              placeholderTextColor="rgba(255,255,255,0.6)"
              style={styles.input}
            />
            <View style={{ flexDirection: "row", justifyContent: "flex-end", columnGap: 10 }}>
              <Pressable onPress={() => setTimeModalOpen(false)} style={[styles.smallBtn, styles.btnGhost]}>
                <Text style={styles.btnGhostText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={applyBulkTime} style={[styles.smallBtn, styles.btnPrimary]}>
                <Text style={styles.btnPrimaryText}>Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { color: "#fff", fontWeight: "800", marginBottom: 8, fontSize: 16 },

  bulkRow: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: 12,
  },
  bulkGroup: { marginBottom: 10 },
  bulkLabel: { color: "rgba(255,255,255,0.9)", fontWeight: "700", marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", columnGap: 8 },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  chipOn: { backgroundColor: "#fff", borderColor: "#fff" },
  chipText: { color: "#fff", fontWeight: "700" },
  chipTextOn: { color: "#000" },

  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: 12,
  },
  iconBubble: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  title: { color: "#fff", fontWeight: "800" },
  sub: { color: "rgba(255,255,255,0.8)", marginTop: 2 },

  dayChip: {
    minWidth: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  dayChipOn: { backgroundColor: "#fff", borderColor: "#fff" },
  dayChipText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  dayChipTextOn: { color: "#000" },

  smallBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  btnGhost: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "transparent",
  },
  btnGhostText: { color: "#fff", fontWeight: "700" },
  btnPrimary: { backgroundColor: "#fff" },
  btnPrimaryText: { color: "#000", fontWeight: "800" },

  // modal
  modalWrap: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center", justifyContent: "center", padding: 24,
  },
  modalCard: {
    width: "100%", maxWidth: 440,
    borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.10)",
    padding: 14,
  },
  modalTitle: { color: "#fff", fontWeight: "800", marginBottom: 10 },
  input: {
    borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 12, paddingVertical: 10, color: "#fff",
    backgroundColor: "rgba(255,255,255,0.08)", marginBottom: 12,
  },
});
