// src/services/rewards.ts
import { useRewardsStore } from "@/state/rewardsStore";

export const REWARD_ACTIONS = {
  start_routine: { points: 5, onceGrant: "startedRoutine" as const },
  daily_checkin: { points: 1 },
  first_post:    { points: 5, onceGrant: "firstPost" as const },
  write_review:  { points: 5 },
  refer_friend:  { points: 20 },
  purchase:      { pointsPerDollar: 1 },
};

// Start routine → once only
export function onRoutineStarted(meta?: Record<string, any>) {
  const { grantOnce } = useRewardsStore.getState();
  return grantOnce("startedRoutine", REWARD_ACTIONS.start_routine.points, "start_routine");
}

// Daily check-in (uses store’s gating + streak)
export function onDailyCheckIn() {
  const { checkIn } = useRewardsStore.getState();
  return checkIn(); // { ok, message }
}

// First post → once only
export function onFirstPost(meta?: Record<string, any>) {
  const { grantOnce } = useRewardsStore.getState();
  return grantOnce("firstPost", REWARD_ACTIONS.first_post.points, "first_post");
}

// One-off earns (can convert to grantOnce later)
export function onWriteReview(meta?: Record<string, any>) {
  const { earn } = useRewardsStore.getState();
  earn(REWARD_ACTIONS.write_review.points, "write_review", meta);
  return true;
}

export function onReferralConfirmed(meta?: Record<string, any>) {
  const { earn } = useRewardsStore.getState();
  earn(REWARD_ACTIONS.refer_friend.points, "refer_friend", meta);
  return true;
}

// $1 = 1pt
export function onPurchaseConfirmed(amountUSD: number, meta?: Record<string, any>) {
  const pts = Math.max(0, Math.floor(amountUSD * (REWARD_ACTIONS.purchase.pointsPerDollar || 1)));
  if (!pts) return false;
  const { earn } = useRewardsStore.getState();
  earn(pts, "purchase", { ...meta, amountUSD });
  return true;
}
