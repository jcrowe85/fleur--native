import React, { useEffect, useRef } from "react";
import {
  Pressable,
  Text,
  View,
  Animated,
  Easing,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRewardsStore } from "../../state/rewardsStore";
import { router } from "expo-router";

export default function RewardsPill() {
  const points = useRewardsStore((s) => s.pointsAvailable);

  // Anim values
  const pillScale = useRef(new Animated.Value(1)).current;
  const sparkleOpacity = useRef(new Animated.Value(0)).current;
  const sparkleTranslateY = useRef(new Animated.Value(0)).current;
  const sparkleScale = useRef(new Animated.Value(0.6)).current;

  const prevPointsRef = useRef(points);

  // Press feedback
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

  // Celebrate only when points increase
  useEffect(() => {
    const prev = prevPointsRef.current;
    if (points > prev) {
      // pop
      Animated.sequence([
        Animated.spring(pillScale, {
          toValue: 1.08,
          useNativeDriver: true,
          friction: 6,
          tension: 140,
        }),
        Animated.spring(pillScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 6,
          tension: 120,
        }),
      ]).start();

      // sparkle
      sparkleOpacity.setValue(0);
      sparkleTranslateY.setValue(0);
      sparkleScale.setValue(0.6);

      Animated.sequence([
        Animated.parallel([
          Animated.timing(sparkleOpacity, {
            toValue: 1,
            duration: 160,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(sparkleTranslateY, {
            toValue: -8,
            duration: 160,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(sparkleScale, {
            toValue: 1.2,
            duration: 160,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(sparkleOpacity, {
            toValue: 0,
            duration: 220,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(sparkleTranslateY, {
            toValue: -14,
            duration: 220,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
    prevPointsRef.current = points;
  }, [points, pillScale, sparkleOpacity, sparkleScale, sparkleTranslateY]);

  return (
    <Animated.View style={{ transform: [{ scale: pillScale }] }}>
      <Pressable
        onPress={() => router.push("/(app)/rewards")}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`Rewards: ${points} points`}
        style={styles.pill}
      >
        <View style={styles.iconWrap}>
          <Feather name="gift" size={14} color="#fff" />
          {/* Sparkle overlay */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.sparkle,
              {
                opacity: sparkleOpacity,
                transform: [
                  { translateY: sparkleTranslateY },
                  { scale: sparkleScale },
                ],
              },
            ]}
          >
            <Feather name="star" size={10} color="#fff" />
          </Animated.View>
        </View>
        <Text style={styles.pointsText}>{points}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    marginRight: 8,
  },
  iconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    marginRight: 6,
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
