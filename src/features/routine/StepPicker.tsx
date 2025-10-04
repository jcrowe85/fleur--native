// src/features/routine/StepPicker.tsx
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

type Rec = {
  id: string;
  name: string;
  instructions?: string;
  product?: string;
  icon?: string;
  defaultPeriod?: "morning" | "evening";
  defaultTime?: string;
  defaultFrequency?: Frequency;
};

export default function StepPicker({
  recommended,
  mapToStep,
  existing,
  onNext,
}: {
  recommended: Rec[];
  mapToStep: (rec: Rec) => RoutineStep;
  existing: RoutineStep[];
  onNext: (selectedSteps: RoutineStep[]) => void;
}) {
  // Seed selection with existing step names when available
  const existingNames = useMemo(() => new Set(existing.map((s) => s.name)), [existing]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () =>
      new Set(
        recommended
          .filter((r) => existingNames.has(r.name))
          .map((r) => r.id)
      )
  );

  // Any custom steps made here (name-only; user schedules in Step 2)
  const [custom, setCustom] = useState<RoutineStep[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [customName, setCustomName] = useState("");

  function toggle(recId: string) {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(recId)) n.delete(recId);
      else n.add(recId);
      return n;
    });
  }

  function addCustom() {
    if (!customName.trim()) return;
    const step: RoutineStep = {
      id: "custom-" + Math.random().toString(36).slice(2, 8),
      name: customName.trim(),
      enabled: true,
      period: "morning",
      time: "8:00 AM",
      frequency: "Daily",
      // days undefined → implied “Daily”
      instructions: "Follow product directions.",
      icon: "star",
    };
    setCustom((prev) => [step, ...prev]);
    setCustomName("");
    setModalOpen(false);
  }

  const selected: RoutineStep[] = useMemo(() => {
    const fromRecs = recommended
      .filter((r) => selectedIds.has(r.id))
      .map(mapToStep);
    return [...custom, ...fromRecs];
  }, [selectedIds, custom, recommended, mapToStep]);

  return (
    <View>
      {/* Section title */}
      <Text style={styles.sectionTitle}>Recommended for you</Text>

      {/* Recommended list (glass cards) */}
      <View style={{ gap: 8 }}>
        {recommended.map((r) => {
          const picked = selectedIds.has(r.id);
          return (
            <Pressable
              key={r.id}
              onPress={() => toggle(r.id)}
              style={[styles.card, picked && styles.cardOn]}
            >
              <View style={styles.iconBubble}>
                <Feather name={(r.icon as any) || "droplet"} size={16} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{r.name}</Text>
                {!!r.instructions && (
                  <Text style={styles.sub}>{r.instructions}</Text>
                )}
                {!!r.product && (
                  <Text style={styles.product}>Product: {r.product}</Text>
                )}
              </View>
              <View style={[styles.pickPill, picked && styles.pickPillOn]}>
                <Text style={[styles.pickText, picked && styles.pickTextOn]}>
                  {picked ? "Added" : "Add"}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Your custom steps */}
      <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Your custom steps</Text>

      {custom.length === 0 ? (
        <Text style={styles.empty}>You haven’t added any custom steps yet.</Text>
      ) : (
        <View style={{ gap: 8 }}>
          {custom.map((c) => (
            <View key={c.id} style={[styles.card, styles.cardOn]}>
              <View style={styles.iconBubble}>
                <Feather name="star" size={16} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{c.name}</Text>
                <Text style={styles.sub}>Default: Morning • 8:00 AM • Daily</Text>
              </View>
              <Pressable
                onPress={() => setCustom((prev) => prev.filter((x) => x.id !== c.id))}
                style={styles.removeBtn}
              >
                <Feather name="x" size={16} color="#fff" />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Add custom button */}
      <Pressable onPress={() => setModalOpen(true)} style={[styles.addBtn]}>
        <Feather name="plus" size={16} color="#fff" />
        <Text style={styles.addBtnText}>Add custom step</Text>
      </Pressable>

      {/* Footer action */}
      <Pressable
        onPress={() => onNext(selected)}
        style={[styles.cta, selected.length === 0 && { opacity: 0.85 }]}
      >
        <Text style={styles.ctaText}>Continue ({selected.length} selected)</Text>
      </Pressable>

      {/* Custom modal */}
      <Modal transparent visible={modalOpen} animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add custom step</Text>
            <TextInput
              value={customName}
              onChangeText={setCustomName}
              placeholder="e.g., Rosemary Oil"
              placeholderTextColor="rgba(255,255,255,0.6)"
              style={styles.input}
            />
            <View style={{ flexDirection: "row", justifyContent: "flex-end", columnGap: 10 }}>
              <Pressable onPress={() => setModalOpen(false)} style={[styles.smallBtn, styles.btnGhost]}>
                <Text style={styles.btnGhostText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={addCustom} style={[styles.smallBtn, styles.btnPrimary]}>
                <Text style={styles.btnPrimaryText}>Add</Text>
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
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: 12,
  },
  cardOn: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.35)",
  },
  iconBubble: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  title: { color: "#fff", fontWeight: "800" },
  sub: { color: "rgba(255,255,255,0.8)", marginTop: 4 },
  product: { color: "rgba(255,255,255,0.75)", marginTop: 2, fontSize: 12 },

  pickPill: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  pickPillOn: { backgroundColor: "#fff", borderColor: "#fff" },
  pickText: { color: "#fff", fontWeight: "700" },
  pickTextOn: { color: "#000" },

  removeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },

  empty: { color: "rgba(255,255,255,0.75)" },

  addBtn: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.10)",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  addBtnText: { color: "#fff", fontWeight: "700" },

  cta: {
    marginTop: 14,
    borderRadius: 999,
    backgroundColor: "#fff",
    alignItems: "center",
    paddingVertical: 12,
  },
  ctaText: { color: "#000", fontWeight: "800" },

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
  smallBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  btnGhost: { borderWidth: 1, borderColor: "rgba(255,255,255,0.35)" },
  btnGhostText: { color: "#fff", fontWeight: "700" },
  btnPrimary: { backgroundColor: "#fff" },
  btnPrimaryText: { color: "#000", fontWeight: "800" },
});
