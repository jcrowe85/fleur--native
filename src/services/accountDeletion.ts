// src/services/accountDeletion.ts
import { supabase } from "./supabase";
import { FUNCTIONS_URL } from "@/config/env";

/**
 * Permanently delete the signed-in user's account.
 *
 * App Store Review Guideline 5.1.1(v) requires any app that lets users create
 * an account to also let them delete it from inside the app. The profile screen
 * previously offered deletion only to guest accounts — and even then it just
 * signed the user out without calling this function, so nothing was deleted.
 *
 * Calls the `soft-delete-user` Edge Function, which anonymises the user's
 * community content, removes their cloud backup and support history, and
 * deletes the auth record.
 */
export async function deleteAccount(): Promise<void> {
  const { data: sessionRes } = await supabase.auth.getSession();
  const session = sessionRes.session;

  if (!session?.user) throw new Error("You are not signed in.");
  if (!FUNCTIONS_URL) throw new Error("Account deletion is not configured.");

  const res = await fetch(`${FUNCTIONS_URL}/soft-delete-user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ userId: session.user.id }),
  });

  let payload: { success?: boolean; error?: string } = {};
  try {
    payload = await res.json();
  } catch {
    // Fall through to the status check below.
  }

  if (!res.ok || !payload.success) {
    throw new Error(payload.error ?? `Deletion failed (${res.status})`);
  }

  // The auth record is gone; drop the local session so the app does not keep
  // trying to refresh a token that no longer resolves.
  await supabase.auth.signOut().catch(() => {});
}

/** Wipe every local store after the server-side account is gone. */
export async function clearAllLocalData(): Promise<void> {
  const [
    { usePlanStore },
    { useOnboardingStore },
    { useProfileStore },
    { useRewardsStore },
    { useRoutineStore },
    { useCheckInStore },
    { usePurchaseStore },
    { useRecommendationsStore },
    { useCartStore },
    { useNotificationStore },
  ] = await Promise.all([
    import("@/state/planStore"),
    import("@/state/onboardingStore"),
    import("@/state/profileStore"),
    import("@/state/rewardsStore"),
    import("@/state/routineStore"),
    import("@/state/checkinStore"),
    import("@/state/purchaseStore"),
    import("@/state/recommendationsStore"),
    import("@/state/cartStore"),
    import("@/state/notificationStore"),
  ]);

  await Promise.all([
    usePlanStore.persist?.clearStorage?.(),
    useOnboardingStore.persist?.clearStorage?.(),
    useProfileStore.persist?.clearStorage?.(),
    useRewardsStore.persist?.clearStorage?.(),
    useRoutineStore.persist?.clearStorage?.(),
    useCheckInStore.persist?.clearStorage?.(),
    usePurchaseStore.persist?.clearStorage?.(),
    useRecommendationsStore.persist?.clearStorage?.(),
    useNotificationStore.persist?.clearStorage?.(),
  ]);

  usePlanStore.getState().clearPlan();
  useRewardsStore.getState().resetAll();
  useRoutineStore.getState().resetAllForDev();
  useCheckInStore.getState().resetAll();
  useCartStore.getState().clear();
  useProfileStore.setState({ profile: null });
  usePurchaseStore.setState({ purchases: [] });
  useRecommendationsStore.setState({ items: [] });
  useOnboardingStore.setState({ answers: {} });
}
