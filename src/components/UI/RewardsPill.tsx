import React, { useEffect, useRef } from "react";
import { Pressable, Text, View, Animated, Easing, StyleSheet, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRewardsStore } from "../../state/rewardsStore";
import { router } from "expo-router";
import { resetAllDataForDev } from "../../dev/resetLocalData";

type Props = {
  compact?: boolean;
};

export default function RewardsPill({ compact }: Props) {
  const points = useRewardsStore((s) => s.pointsAvailable);

  // Anim values
  const pillScale = useRef(new Animated.Value(1)).current;
  const sparkleOpacity = useRef(new Animated.Value(0)).current;
  const sparkleTranslateY = useRef(new Animated.Value(0)).current;
  const sparkleScale = useRef(new Animated.Value(0.6)).current;

  const prevPointsRef = useRef(points);

  const onPressIn = () => {
    Animated.spring(pillScale, {
      toValue: 0.97,
      useNativeDriver: true,
      friction: 6,
      tension: 120,
    }).start();
  };
  const onPressOut = () => {
    Animated.spring(pillScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
      tension: 120,
    }).start();
  };

  const handleLongPress = () => {
    Alert.alert(
      "🧪 Dev Reset - Reset ALL Data",
      "This will completely reset the app including plan build protection. Perfect for testing the full onboarding flow. Are you sure?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reset Everything",
          style: "destructive",
          onPress: async () => {
            try {
              await resetAllDataForDev();
              // Navigation will be handled by the reset function
            } catch (error) {
              console.error("Error resetting data:", error);
              Alert.alert("Error", "Failed to reset data. Please try again.");
            }
          },
        },
      ]
    );
  };

  // Celebrate only when points increase
  useEffect(() => {
    const prev = prevPointsRef.current;
    if (points > prev) {
      Animated.sequence([
        Animated.spring(pillScale, { toValue: 1.08, useNativeDriver: true, friction: 6, tension: 140 }),
        Animated.spring(pillScale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 120 }),
      ]).start();

      sparkleOpacity.setValue(0);
      sparkleTranslateY.setValue(0);
      sparkleScale.setValue(0.6);

      Animated.sequence([
        Animated.parallel([
          Animated.timing(sparkleOpacity, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(sparkleTranslateY, { toValue: -8, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(sparkleScale, { toValue: 1.2, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(sparkleOpacity, { toValue: 0, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.timing(sparkleTranslateY, { toValue: -14, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]),
      ]).start();
    }
    prevPointsRef.current = points;
  }, [points, pillScale, sparkleOpacity, sparkleScale, sparkleTranslateY]);

  // sizes for regular vs compact (reduced by 15% from previous)
  const s = compact
    ? {
        pill: { paddingV: 4, paddingH: 8 },
        icon: { box: 20, rad: 10, icon: 13, star: 9 },
        textSize: 13,
      }
    : {
        pill: { paddingV: 7, paddingH: 11 },
        icon: { box: 24, rad: 12, icon: 15, star: 11 },
        textSize: 15,
      };

  return (
    <Animated.View style={{ transform: [{ scale: pillScale }] }}>
      <Pressable
        onPress={() => router.push("/(app)/rewards")}
        onLongPress={handleLongPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`Rewards: ${points} points`}
        style={[
          styles.pill,
          {
            paddingVertical: s.pill.paddingV,
            paddingHorizontal: s.pill.paddingH,
          },
        ]}
      >
        <View
          style={[
            styles.iconWrap,
            { width: s.icon.box, height: s.icon.box, borderRadius: s.icon.rad, marginRight: 6 },
          ]}
        >
          <Feather name="gift" size={s.icon.icon} color="#fff" />
          {/* Sparkle overlay */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.sparkle,
              {
                opacity: sparkleOpacity,
                transform: [{ translateY: sparkleTranslateY }, { scale: sparkleScale }],
              },
            ]}
          >
            <Feather name="star" size={s.icon.star} color="#fff" />
          </Animated.View>
        </View>
        <Text style={[styles.pointsText, { fontSize: s.textSize }]}>{points}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    position: "relative",
    overflow: "visible",
  },
  sparkle: {
    position: "absolute",
    right: -2,
    top: -2,
  },
  pointsText: { color: "#fff", fontWeight: "700" },
});
