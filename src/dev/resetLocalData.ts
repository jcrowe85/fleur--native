// src/dev/resetLocalData.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { supabase } from "@/services/supabase";
import { usePlanStore } from "@/state/planStore";
import { useOnboardingStore } from "@/state/onboardingStore";
import { useAuthStore } from "@/state/authStore";
import { useProfileStore } from "@/state/profileStore";

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
    useAuthStore.persist?.clearStorage?.(),
  ]);

  // 3) Proactively remove known app keys + any Supabase keys
  try {
    const keys = await AsyncStorage.getAllKeys();
    const sbKeys = keys.filter((k) => k.startsWith("sb-") || k.startsWith("supabase.auth"));
    const appKeys = ["fleur-plan-v1", "fleur-onboarding-v1", "fleur-profile-v1"];
    const toRemove = Array.from(new Set([...sbKeys, ...appKeys]));
    if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
  } catch (e) {
    console.warn("[resetLocalData] multiRemove warn:", e);
  }

  // 4) Reset in-memory state so UI reflects it immediately
  usePlanStore.setState({ plan: null, hasSeenPlanIntro: false });
  useOnboardingStore.setState({ answers: {} });
  useProfileStore.setState({ profile: null });
  useAuthStore.setState({ loading: false, error: null }); // optional, depending on your store shape

  // 5) Send user to the welcome flow (bootstrap will create a fresh anon session)
  router.replace("/");
}
