// src/components/RewardsPill.tsx
import React from "react";
import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRewardsStore } from "../../state/rewardsStore";
import { router } from "expo-router";

export default function RewardsPill() {
  const points = useRewardsStore((s) => s.pointsAvailable);

  return (
    <Pressable
      onPress={() => router.push("/(app)/rewards")}
      hitSlop={10}
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 999,
        paddingVertical: 6,
        paddingHorizontal: 10,
        backgroundColor: "rgba(255,255,255,0.12)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.25)",
        marginRight: 8,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(255,255,255,0.16)",
          marginRight: 6,
        }}
      >
        <Feather name="gift" size={14} color="#fff" />
      </View>
      <Text style={{ color: "#fff", fontWeight: "700" }}>{points}</Text>
    </Pressable>
  );
}
