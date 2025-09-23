// src/services/rewards.ts
import { useRewardsStore } from "@/state/rewardsStore";

export const REWARD_ACTIONS = {
  start_routine: { points: 5, onceGrant: "startedRoutine" as const },
  daily_checkin: { points: 1 },
  seven_day_streak: { points: 2 }, // bonus for 7-day streaks
  daily_routine_task: { points: 1, maxPerDay: 5 },
  first_routine_step: { points: 5, onceGrant: "firstRoutineStep" as const },
  first_post: { points: 5, onceGrant: "firstPost" as const },
  first_comment: { points: 5, onceGrant: "firstComment" as const },
  first_like: { points: 1, onceGrant: "firstLike" as const },
  post_engagement_likes: { points: 1, threshold: 100 }, // 1pt per 100 likes
  post_engagement_comments: { points: 5, threshold: 10 }, // 5pts per 10 comments
  refer_friend: { points: 20, maxReferrals: 20 },
  write_review: { points: 5 },
  purchase: { pointsPerDollar: 1 },
};

// Start routine → once only
export function onRoutineStarted(meta?: Record<string, any>) {
  const { grantOnce } = useRewardsStore.getState();
  return grantOnce("startedRoutine", REWARD_ACTIONS.start_routine.points, "start_routine");
}

// Daily check-in (uses store's gating + streak)
export function onDailyCheckIn() {
  const { checkIn } = useRewardsStore.getState();
  return checkIn(); // { ok, message }
}

// Undo daily check-in
export function onDailyCheckInUndone() {
  const { undoCheckIn } = useRewardsStore.getState();
  return undoCheckIn(); // { ok, message }
}

// Routine task completion
export function onRoutineTaskCompleted(taskId: string) {
  const { completeRoutineTask } = useRewardsStore.getState();
  return completeRoutineTask(taskId); // { ok, message, points }
}

// Routine task undo
export function onRoutineTaskUndone(taskId: string) {
  const { undoRoutineTask } = useRewardsStore.getState();
  return undoRoutineTask(taskId); // { ok, message, points }
}

// First post → once only
export function onFirstPost(meta?: Record<string, any>) {
  const { grantOnce } = useRewardsStore.getState();
  return grantOnce("firstPost", REWARD_ACTIONS.first_post.points, "first_post");
}

// First comment → once only
export function onFirstComment(meta?: Record<string, any>) {
  const { grantOnce } = useRewardsStore.getState();
  return grantOnce("firstComment", REWARD_ACTIONS.first_comment.points, "first_comment");
}

// First like → once only
export function onFirstLike(meta?: Record<string, any>) {
  const { grantOnce } = useRewardsStore.getState();
  return grantOnce("firstLike", REWARD_ACTIONS.first_like.points, "first_like");
}

// Post engagement rewards
export function onPostEngagement(postId: string, likes: number, comments: number) {
  const { earn } = useRewardsStore.getState();
  let totalPoints = 0;
  
  // Award points for likes (1pt per 100 likes)
  const likePoints = Math.floor(likes / REWARD_ACTIONS.post_engagement_likes.threshold);
  if (likePoints > 0) {
    earn(likePoints, "post_engagement_likes", { postId, likes, points: likePoints });
    totalPoints += likePoints;
  }
  
  // Award points for comments (5pts per 10 comments)
  const commentPoints = Math.floor(comments / REWARD_ACTIONS.post_engagement_comments.threshold) * REWARD_ACTIONS.post_engagement_comments.points;
  if (commentPoints > 0) {
    earn(commentPoints, "post_engagement_comments", { postId, comments, points: commentPoints });
    totalPoints += commentPoints;
  }
  
  return { totalPoints, likePoints, commentPoints };
}

// Referral confirmed
export function onReferralConfirmed(meta?: Record<string, any>) {
  const { addReferral } = useRewardsStore.getState();
  return addReferral(); // { ok, message }
}

// One-off earns (can convert to grantOnce later)
export function onWriteReview(meta?: Record<string, any>) {
  const { earn } = useRewardsStore.getState();
  earn(REWARD_ACTIONS.write_review.points, "write_review", meta);
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

// Reverse points when a routine step is deleted
export function onRoutineStepDeleted(taskId: string) {
  const { reverseAction, ledger } = useRewardsStore.getState();
  let totalReversed = 0;
  
  // Find all ledger entries related to this step
  const stepEntries = ledger.filter(item => 
    item.reason === "daily_routine_task" && 
    item.meta?.taskId === taskId &&
    item.delta > 0
  );
  
  // Reverse each routine task entry
  stepEntries.forEach(entry => {
    const result = reverseAction(entry.id);
    if (result.ok) {
      totalReversed += entry.delta;
    }
  });
  
  return { ok: true, message: `Routine step deleted. -${totalReversed} point${totalReversed !== 1 ? 's' : ''}`, points: -totalReversed };
}
