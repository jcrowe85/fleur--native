// src/dev/resetLocalData.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePlanStore } from "@/state/planStore";
import { useOnboardingStore } from "@/state/onboardingStore";
import { router } from "expo-router";

export async function resetLocalData() {
  // Clear persisted storage for each store (safe across reloads)
  await usePlanStore.persist.clearStorage();
  await useOnboardingStore.persist?.clearStorage?.();

  // (Optional belt & suspenders) remove exact keys if you know them
  await AsyncStorage.multiRemove(["fleur-plan-v1", "fleur-onboarding-v1"]);

  // Reset in-memory state so UI updates immediately
  usePlanStore.setState({ plan: null, hasSeenPlanIntro: false });
  useOnboardingStore.setState({ answers: {} });

  // Send user back to the welcome flow
  router.replace("/");
}
