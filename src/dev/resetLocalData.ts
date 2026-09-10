// src/dev/resetLocalData.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { supabase } from "@/services/supabase";
import { usePlanStore } from "@/state/planStore";
import { useOnboardingStore } from "@/state/onboardingStore";
import { useAuthStore } from "@/state/authStore";
import { useProfileStore } from "@/state/profileStore";
import { useRewardsStore } from "@/state/rewardsStore";
import { useRoutineStore } from "@/state/routineStore";
import { useCheckInStore } from "@/state/checkinStore";
import { usePurchaseStore } from "@/state/purchaseStore";
import { useRecommendationsStore } from "@/state/recommendationsStore";

/** Resolve, or give up, after `ms` — so a dead backend cannot stall the reset. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T | void> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(() => {
      console.warn(`[resetAllDataForDev] ${label} timed out after ${ms}ms; continuing`);
      resolve();
    }, ms);
  });

  // Clearing the timer matters: without it a fast signOut still logged a
  // "timed out" warning seconds later, after the reset had already finished.
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

// Complete dev reset that bypasses all protections (for testing)
export async function resetAllDataForDev() {
  console.log("🧪 DEV RESET: clearing all local data");

  // 1) Drop the Supabase session so the next launch mints a fresh guest.
  //
  //    signOut() makes several network calls (getUser, a final cloud sync, then
  //    signOut). If the project is paused or the device is offline those hang
  //    for the full socket timeout and the reset appears to do nothing, so cap
  //    it and fall through to the local cleanup either way.
  try {
    await withTimeout(useAuthStore.getState().signOut(), 4000, "signOut");
  } catch (e) {
    console.warn("[resetAllDataForDev] signOut failed:", e);
  }

  // 1b) Clear the session from SecureStore directly.
  //
  //     Sessions live in SecureStore (see secureStoreAdapter), not AsyncStorage,
  //     so the multiRemove below cannot reach them. Without this the "reset"
  //     leaves the user signed in to the same guest account and onboarding is
  //     skipped on relaunch.
  try {
    const { purgeSecureKey, supabaseAuthStorageKey } = await import(
      "@/services/secureStoreAdapter"
    );
    const { SUPABASE_URL } = await import("@/config/env");
    const key = supabaseAuthStorageKey(SUPABASE_URL);
    if (key) await purgeSecureKey(key);
  } catch (e) {
    console.warn("[resetAllDataForDev] SecureStore purge failed:", e);
  }

  // 2) Clear persisted stores
  await Promise.all([
    usePlanStore.persist?.clearStorage?.(),
    useOnboardingStore.persist?.clearStorage?.(),
    useProfileStore.persist?.clearStorage?.(),
    // useAuthStore doesn't use persist middleware
    useRewardsStore.persist?.clearStorage?.(),
    useRoutineStore.persist?.clearStorage?.(),
    useCheckInStore.persist?.clearStorage?.(),
    usePurchaseStore.persist?.clearStorage?.(),
    useRecommendationsStore.persist?.clearStorage?.(),
  ]);

  // 3) Proactively remove known app keys + any Supabase keys
  try {
    const keys = await AsyncStorage.getAllKeys();
    const sbKeys = keys.filter((k) => k.startsWith("sb-") || k.startsWith("supabase.auth"));
    const appKeys = [
      "fleur-plan-v1", 
      "onboarding-v1", 
      "profile", 
      "rewards:v2",
      "routine:v2",
      "checkin:v1",
      "fleur-purchases-v1",
      "recs:v1",
      "invitedContacts"
    ];
    const toRemove = Array.from(new Set([...sbKeys, ...appKeys]));
    if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
  } catch (e) {
    console.warn("[resetAllDataForDev] multiRemove warn:", e);
  }

  // 4) Reset in-memory state so UI reflects it immediately
  usePlanStore.setState({ plan: null });
  useOnboardingStore.setState({ answers: {} });
  useProfileStore.setState({ profile: null });
  useAuthStore.setState({ loading: false, error: null, session: null, user: null });
  useRewardsStore.getState().resetAll();
  useRoutineStore.getState().resetAllForDev(); // Dev reset that bypasses all protections
  useCheckInStore.setState({ checkIns: [] });
  usePurchaseStore.setState({ purchases: [] });
  useRecommendationsStore.setState({ items: [] });

  console.log("✅ DEV RESET: All data cleared, plan build protection reset");
  
  // 5) Send user to the welcome flow (bootstrap will create a fresh anon session)
  // Longer delay to ensure all state is fully cleared and stores are rehydrated
  setTimeout(() => {
    console.log("🧪 DEV RESET: Navigating to welcome screen");
    // Only dismiss when there is actually a stack to unwind. Calling
    // dismissAll() at the root makes expo-router log "The action 'POP_TO_TOP'
    // was not handled by any navigator", which is the common case when
    // resetting from the welcome screen itself.
    if (router.canDismiss?.()) router.dismissAll();
    router.replace("/");
  }, 500);
}

export async function resetLocalData() {
  // 1) Drop Supabase session (so next launch gets a fresh anon user)
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn("[resetLocalData] signOut failed:", e);
  }

  // 2) Clear persisted stores
  await Promise.all([
    usePlanStore.persist?.clearStorage?.(),
    useOnboardingStore.persist?.clearStorage?.(),
    useProfileStore.persist?.clearStorage?.(),
    // useAuthStore doesn't use persist middleware
    useRewardsStore.persist?.clearStorage?.(),
    useRoutineStore.persist?.clearStorage?.(),
    useCheckInStore.persist?.clearStorage?.(),
    usePurchaseStore.persist?.clearStorage?.(),
    useRecommendationsStore.persist?.clearStorage?.(),
  ]);

  // 3) Proactively remove known app keys + any Supabase keys
  try {
    const keys = await AsyncStorage.getAllKeys();
    const sbKeys = keys.filter((k) => k.startsWith("sb-") || k.startsWith("supabase.auth"));
    const appKeys = [
      "fleur-plan-v1", 
      "onboarding-v1", 
      "profile", 
      "rewards:v2",
      "routine:v2",
      "checkin:v1",
      "fleur-purchases-v1",
      "recs:v1",
      "invitedContacts"
    ];
    const toRemove = Array.from(new Set([...sbKeys, ...appKeys]));
    if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
  } catch (e) {
    console.warn("[resetLocalData] multiRemove warn:", e);
  }

  // 4) Reset in-memory state so UI reflects it immediately
  usePlanStore.setState({ plan: null });
  useOnboardingStore.setState({ answers: {} });
  useProfileStore.setState({ profile: null });
  useAuthStore.setState({ loading: false, error: null }); // optional, depending on your store shape
  useRewardsStore.getState().resetAll(); // Reset rewards store to initial state
  useRoutineStore.getState().resetAll(); // Reset routine store to initial state
  useCheckInStore.setState({ checkIns: [] }); // Reset check-in store
  usePurchaseStore.setState({ purchases: [] }); // Reset purchase store
  useRecommendationsStore.setState({ items: [] }); // Reset recommendations store

  // 5) Send user to the welcome flow (bootstrap will create a fresh anon session)
  router.replace("/");
}
