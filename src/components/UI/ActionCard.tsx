import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

type Props = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  pointsLabel?: string;         // e.g. "+5" or "1/$"
  onPress?: () => void;
  disabled?: boolean;
};

export default function ActionCard({ icon, title, subtitle, pointsLabel, onPress, disabled }: Props) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.card, disabled && { opacity: 0.5 }]}>
      <View style={styles.iconWrap}>
        <Feather name={icon} size={18} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.sub}>{subtitle}</Text>}
      </View>
      {!!pointsLabel && (
        <View style={styles.pointsPill}>
          <Text style={styles.pointsText}>{pointsLabel}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.06)",
    marginBottom: 10,
  },
  iconWrap: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    marginRight: 10,
  },
  title: { color: "#fff", fontWeight: "700" },
  sub: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 },
  pointsPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "#fff", marginLeft: 10 },
  pointsText: { color: "#000", fontWeight: "800", fontSize: 12 },
});
