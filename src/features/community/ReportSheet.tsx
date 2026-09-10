// src/features/community/ReportSheet.tsx
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { REPORT_REASONS, type ReportReason } from "./moderation.service";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: ReportReason) => Promise<void>;
  title?: string;
};

/** Reason picker shown when a user reports a post or comment. */
export default function ReportSheet({ visible, onClose, onSubmit, title }: Props) {
  const [submitting, setSubmitting] = useState<ReportReason | null>(null);

  const choose = async (reason: ReportReason) => {
    if (submitting) return;
    setSubmitting(reason);
    try {
      await onSubmit(reason);
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>{title ?? "Report content"}</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
            <Feather name="x" size={22} color="rgba(255,255,255,0.7)" />
          </Pressable>
        </View>

        <Text style={styles.subtitle}>
          Thanks for helping keep Fleur safe. We review every report within 24 hours.
        </Text>

        <ScrollView>
          {REPORT_REASONS.map((reason) => (
            <Pressable
              key={reason.code}
              onPress={() => choose(reason.code)}
              style={styles.row}
              accessibilityRole="button"
            >
              <Text style={styles.rowText}>{reason.label}</Text>
              {submitting === reason.code ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.4)" />
              )}
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "70%",
    backgroundColor: "#1a1512",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  title: { color: "#fff", fontSize: 17, fontWeight: "700" },
  subtitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  rowText: { color: "#fff", fontSize: 15 },
});
