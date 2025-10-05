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

// Complete dev reset that bypasses all protections (for testing)
export async function resetAllDataForDev() {
  console.log("🧪 DEV RESET: Complete data reset including plan build protection");
  
  // 1) Drop Supabase session (so next launch gets a fresh anon user)
  try {
    await useAuthStore.getState().signOut();
  } catch (e) {
    console.warn("[resetAllDataForDev] signOut failed:", e);
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
    // Clear navigation stack and go to root
    router.dismissAll();
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
