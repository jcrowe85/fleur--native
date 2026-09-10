// src/dev/DevResetGesture.tsx
import React, { useCallback, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View, type ViewStyle, type StyleProp } from "react-native";
import { resetAllDataForDev } from "./resetLocalData";

/** How long the hold must be sustained before the reset prompt appears. */
export const DEV_RESET_HOLD_MS = 3000;

type Props = {
  children: React.ReactNode;
  /** Shown in the confirm dialog so you know which control you hit. */
  label?: string;
  /**
   * Applied to the wrapping Pressable. Needed wherever the wrapped element
   * relied on a layout prop from its parent — wrapping a `flex: 1` child
   * without passing flex through collapses it.
   */
  style?: StyleProp<ViewStyle>;
};

/**
 * Wraps any element in a hidden, developer-only "wipe local data" gesture.
 *
 * Hold for 3 seconds to get a confirm prompt, then everything local is cleared
 * and the app returns to the welcome screen — which is what you want when
 * re-testing onboarding.
 *
 * In a release build this renders `children` directly with no Pressable, no
 * handler and no import cost, so there is nothing for a customer to discover.
 * (The previous gesture lived only on the rewards pill, which renders on the
 * eight signed-in screens — meaning you had to finish onboarding to reach the
 * control that resets onboarding.)
 */
export default function DevResetGesture({ children, label = "app", style }: Props) {
  if (!__DEV__) return <>{children}</>;
  return (
    <DevResetGestureInner label={label} style={style}>
      {children}
    </DevResetGestureInner>
  );
}

function DevResetGestureInner({ children, label, style }: Props & { label: string }) {
  const [holding, setHolding] = useState(false);
  const busy = useRef(false);

  const confirmReset = useCallback(() => {
    setHolding(false);
    if (busy.current) return;

    Alert.alert(
      "Reset local data?",
      `Clears every local store and the current guest account, then returns to the welcome screen.\n\nTriggered from: ${label}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            busy.current = true;
            try {
              await resetAllDataForDev();
            } catch (error) {
              console.error("[dev-reset] failed:", error);
              Alert.alert(
                "Reset failed",
                error instanceof Error ? error.message : "See the console for details."
              );
            } finally {
              busy.current = false;
            }
          },
        },
      ]
    );
  }, [label]);

  return (
    <Pressable
      onLongPress={confirmReset}
      delayLongPress={DEV_RESET_HOLD_MS}
      onPressIn={() => setHolding(true)}
      onPressOut={() => setHolding(false)}
      // Let normal taps through to whatever is underneath.
      android_disableSound
      style={style}
    >
      {children}
      {holding && (
        <View pointerEvents="none" style={styles.hint}>
          <Text style={styles.hintText}>hold to reset…</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hint: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -18,
    alignItems: "center",
  },
  hintText: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 10,
    letterSpacing: 0.5,
  },
});
