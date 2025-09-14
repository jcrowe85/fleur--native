// app/index.tsx
import React, { useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { Redirect } from "expo-router";
import { usePlanStore } from "@/state/planStore";
import WelcomeScreen from "../src/screens/WelcomeScreen";

// Keep splash until we decide
SplashScreen.preventAutoHideAsync().catch(() => {});

function useStoreHydrated(): boolean {
  // Prefer zustand's own hydration flags; fall back to false
  const hasHydratedFn = usePlanStore.persist?.hasHydrated;
  const onFinishHydration = usePlanStore.persist?.onFinishHydration;

  const [hydrated, setHydrated] = useState<boolean>(() => {
    try {
      return hasHydratedFn ? hasHydratedFn() : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!onFinishHydration) return;
    const unsub = onFinishHydration(() => setHydrated(true));
    return unsub;
  }, [onFinishHydration]);

  return hydrated;
}

export default function IndexGate() {
  const plan = usePlanStore((s) => s.plan);
  const hydrated = useStoreHydrated();

  // Watchdog: even if hydration callback never fires, show UI after 2.5s
  const [timeoutFired, setTimeoutFired] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimeoutFired(true), 2500);
    return () => clearTimeout(t);
  }, []);

  // Hide splash as soon as we can show *something*
  useEffect(() => {
    if (hydrated || timeoutFired) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [hydrated, timeoutFired]);

  // Keep splash visible until either hydrated OR watchdog fires
  if (!hydrated && !timeoutFired) return null;

  // If a plan exists (returning user), go straight to dashboard
  if (plan) return <Redirect href="/(app)/dashboard" />;

  // First-time user — show Welcome
  return <WelcomeScreen />;
}
