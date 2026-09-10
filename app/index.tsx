// app/index.tsx
import React, { useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { Redirect } from "expo-router";
import { usePlanStore } from "@/state/planStore";
import WelcomeScreen from "../src/screens/WelcomeScreen";

/**
 * Hold the splash until we know whether this is a returning user.
 *
 * The previous version tracked readiness in two module-level booleans and only
 * hid the splash from an effect keyed on [hydrated, timeoutFired]. If
 * preventAutoHideAsync() resolved *after* both of those had already settled —
 * which is the common case on a warm start — the effect never re-ran and the
 * splash stayed up forever. Keeping the promise itself and awaiting it removes
 * the ordering dependency entirely.
 */
const splashReady = SplashScreen.preventAutoHideAsync().catch(() => {});

let splashHidden = false;
async function hideSplash() {
  if (splashHidden) return;
  splashHidden = true;
  await splashReady;
  await SplashScreen.hideAsync().catch(() => {});
}

/** How long to wait for rehydration before showing UI anyway. */
const HYDRATION_TIMEOUT_MS = 2500;

function useStoreHydrated(): boolean {
  const [hydrated, setHydrated] = useState<boolean>(
    () => usePlanStore.persist?.hasHydrated?.() ?? false
  );

  useEffect(() => {
    if (hydrated) return;

    const unsub = usePlanStore.persist?.onFinishHydration?.(() => setHydrated(true));

    // Re-check synchronously: hydration can finish between the initial state
    // read and this subscription being attached.
    if (usePlanStore.persist?.hasHydrated?.()) setHydrated(true);

    return unsub;
  }, [hydrated]);

  return hydrated;
}

export default function IndexGate() {
  const plan = usePlanStore((s) => s.plan);
  const hydrated = useStoreHydrated();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), HYDRATION_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  const ready = hydrated || timedOut;

  useEffect(() => {
    if (ready) void hideSplash();
  }, [ready]);

  if (!ready) return null;

  // Returning user with a saved plan goes straight to the dashboard.
  if (plan) return <Redirect href="/(app)/dashboard" />;

  return <WelcomeScreen />;
}
