// app/index.tsx
import React, { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { usePlanStore } from "@/state/planStore";
import WelcomeScreen from "../src/screens/WelcomeScreen";
import BrandedLoader from "@/components/UI/BrandedLoader";

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

/**
 * Decides where a launch lands: dashboard for a returning user, welcome
 * otherwise.
 *
 * Splash hiding lives in the root layout, not here — this component only mounts
 * for "/", so owning the splash meant any other entry point (a notification
 * deep link into /routine, say) left it up over a rendered app.
 */
export default function IndexGate() {
  const plan = usePlanStore((s) => s.plan);
  const hydrated = useStoreHydrated();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), HYDRATION_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  // Show the branded loader rather than null, so the gap between the splash
  // hiding and the first screen is never a blank frame.
  if (!hydrated && !timedOut) return <BrandedLoader message="Preparing your space" />;

  if (plan) return <Redirect href="/(app)/dashboard" />;

  return <WelcomeScreen />;
}
