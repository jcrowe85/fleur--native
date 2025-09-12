// app/(plan)/_layout.tsx
import React from "react";
import { Stack } from "expo-router";
import { ImageBackground, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function PlanLayout() {
  return (
    <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: "#0b0b0b" }}>
          <Stack
            initialRouteName="summary"
            screenOptions={{
              headerShown: false,
              // OPAQUE so the prior screen never shows through
              contentStyle: { backgroundColor: "#0b0b0b" },
              animation: "slide_from_right", // or "none" if you prefer hard cut
              detachPreviousScreen: true,
              freezeOnBlur: true,
            }}
      />
        </View>
     
    </SafeAreaProvider>
  );
}