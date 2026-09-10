// src/components/UI/BrandedLoader.tsx
import React, { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  cancelAnimation,
  Easing,
} from "react-native-reanimated";

/** Matches the pulse used on the onboarding "generating" screen. */
const PULSE_MS = 1100;
const MIN_OPACITY = 0.45;

type Props = {
  /** Line shown under the logo while waiting. */
  message?: string;
  /** When set, the loader becomes an error state with a retry action. */
  error?: string | null;
  onRetry?: () => void;
};

/**
 * Full-bleed branded loading / error screen.
 *
 * Replaces a centred ActivityIndicator inside a blurred card floating on a flat
 * rgba(0,0,0,0.6) scrim — which read as a generic system modal rather than part
 * of the app. This uses the same dashboard backdrop the tabs sit on, so the
 * handoff into the app is seamless rather than a cut from grey box to artwork.
 */
export default function BrandedLoader({ message = "Preparing your space", error, onRetry }: Props) {
  const fade = useSharedValue(1);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setReduceMotion(v))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (error || reduceMotion) {
      cancelAnimation(fade);
      fade.value = 1;
      return;
    }

    fade.value = MIN_OPACITY;
    fade.value = withRepeat(
      withTiming(1, { duration: PULSE_MS, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );

    return () => cancelAnimation(fade);
  }, [error, reduceMotion, fade]);

  const pulse = useAnimatedStyle(() => ({ opacity: fade.value }));

  return (
    <View style={styles.root}>
      <ImageBackground
        source={require("../../../assets/dashboard.png")}
        resizeMode="cover"
        style={StyleSheet.absoluteFillObject}
      >
        {/* Deepens the corners so the type stays legible over the artwork. */}
        <LinearGradient
          colors={["rgba(18,13,10,0.35)", "rgba(18,13,10,0.15)", "rgba(18,13,10,0.65)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </ImageBackground>

      <View style={styles.content}>
        <ImageBackground
          source={require("../../../assets/logo.png")}
          resizeMode="contain"
          style={styles.logo}
        />

        {error ? (
          <View style={styles.errorBlock}>
            <Text style={styles.errorTitle}>We couldn't connect</Text>
            <Text style={styles.errorBody}>{error}</Text>

            {onRetry && (
              // The pill lives on an inner View rather than on the Pressable.
              // This project compiles JSX through nativewind, whose wrapper does
              // not apply the function form of `style`, so
              // `style={({pressed}) => [...]}` silently dropped the white
              // background and left dark label text on dark artwork.
              <Pressable
                onPress={onRetry}
                accessibilityRole="button"
                accessibilityLabel="Try again"
                hitSlop={8}
                android_ripple={{ color: "rgba(0,0,0,0.12)", borderless: false }}
              >
                <View style={styles.retry}>
                  <Text style={styles.retryLabel}>Try again</Text>
                </View>
              </Pressable>
            )}
          </View>
        ) : (
          <Animated.Text
            style={[styles.message, pulse]}
            accessibilityRole="text"
            accessibilityLabel={message}
          >
            {message}
          </Animated.Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#120d0a" },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logo: { width: 168, height: 44, marginBottom: 28 },

  message: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "300",
    letterSpacing: 0.6,
    textAlign: "center",
  },

  errorBlock: { alignItems: "center", maxWidth: 340 },
  errorTitle: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  errorBody: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
  },
  retry: {
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 34,
    paddingVertical: 14,
    overflow: "hidden",
  },
  retryLabel: { color: "#120d0a", fontWeight: "600", fontSize: 15 },
});
