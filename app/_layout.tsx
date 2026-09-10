// app/_layout.tsx
import "react-native-gesture-handler";
import "react-native-reanimated";
import "../global.css";

import React, { useEffect } from "react";
import { Slot } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";

import ErrorBoundary from "../src/components/ErrorBoundary";
import { assertEnvConfigured } from "../src/config/env";
import { hideSplash } from "../src/lib/splash";

function ConfigGate({ children }: { children: React.ReactNode }) {
  // Throws inside the boundary when an EXPO_PUBLIC_* var was missing at build
  // time, so a misconfigured build shows a readable message instead of failing
  // silently against localhost.
  assertEnvConfigured();
  return <>{children}</>;
}

export default function Root() {
  // Release the splash once the tree has mounted, whatever route we entered on.
  useEffect(() => {
    void hideSplash();
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <ConfigGate>
            <Slot />
          </ConfigGate>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
