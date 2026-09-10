// src/state/rewardsStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import dayjs from "dayjs";
import { FirstActionService } from "../services/firstActionService";
import { useCheckInStore } from "./checkinStore";

type LedgerItem = {
  id: string;             // uuid-ish
  ts: number;             // epoch ms
  delta: number;          // +points or -points
  reason: string;         // "daily_check_in", "start_routine", "first_post", "redeem", etc.
  meta?: Record<string, any>;
  reversible?: boolean;   // whether this action can be undone
  relatedActionId?: string; // ID of the action that can reverse this
};

type Grants = {
  signupBonus?: boolean;     // awarded once for signing up
  startedRoutine?: boolean;  // awarded once when user completes routine setup
  firstPost?: boolean;       // awarded once after first post
  firstComment?: boolean;    // awarded once after first comment
  firstLike?: boolean;       // awarded once after first like
  firstRoutineStep?: boolean; // awarded once after first routine step completion
};

type RewardsState = {
  pointsTotal: number;       // lifetime points earned (you can use for tiers if you like)
  pointsAvailable: number;   // spendable points shown in UI
  points: number;            // alias for pointsAvailable (used in some screens)
  streakDays: number;
  lastCheckInISO: string | null;
  ledger: LedgerItem[];
  grants: Grants;
  firstPointCallback?: () => void; // Callback for first point earned
  signupBonusCallback?: () => void; // Callback for signup bonus
  hasPerformedFirstAction?: boolean; // Track if user has performed their first action
  
  // Daily routine tracking
  dailyRoutinePoints: number; // points earned from routine tasks today
  lastRoutineDate: string | null; // YYYY-MM-DD format
  referralCount: number; // number of successful referrals (max 20)
  
  // Legacy properties for compatibility
  events: LedgerItem[]; // alias for ledger
  pointsHistory: LedgerItem[]; // alias for ledger

  // derived helpers (lightweight)
  hasCheckedInToday: () => boolean;
  hasCompletedRoutineToday: () => boolean;
  getDailyRoutinePointsRemaining: () => number;

  // core mutations
  earn: (delta: number, reason: string, meta?: Record<string, any>, reversible?: boolean, relatedActionId?: string) => { ok: boolean; message: string | undefined };
  checkIn: () => { ok: boolean; message: string };
  undoCheckIn: () => { ok: boolean; message: string };
  grantOnce: (key: keyof Grants, delta: number, reason: string) => boolean;
  setFirstPointCallback: (callback: () => void) => void;
  setSignupBonusCallback: (callback: () => void) => void;
  awardSignupBonus: () => boolean;
  syncFirstActionState: () => Promise<void>;
  
  // routine task tracking
  completeRoutineTask: (taskId: string) => { ok: boolean; message: string; points: number };
  undoRoutineTask: (taskId: string) => { ok: boolean; message: string; points: number };
  
  // referral tracking
  addReferral: () => { ok: boolean; message: string };
  
  // anti-gaming measures
  validateAction: (reason: string, meta?: Record<string, any>) => { valid: boolean; message?: string };
  reverseAction: (actionId: string) => { ok: boolean; message: string };

  // admin/debug helpers (optionally use in dev menu)
  resetAll: () => void;

  // legacy methods for compatibility
  addPoints: (points: number) => void;
};

function uid() {
  return Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
}

const MAX_LEDGER_ENTRIES = 200;

/**
 * `points`, `events` and `pointsHistory` are read-only aliases of
 * `pointsAvailable` / `ledger` kept for older screens.
 *
 * They were previously updated by hand inside `earn` only, so `reverseAction`
 * (undo a check-in, delete a routine step) left them stale: the rewards pill
 * kept showing the pre-undo balance and the analytics screen kept showing the
 * reversed entries. Every mutation now goes through this helper.
 */
function withAliases(ledger: LedgerItem[], pointsAvailable: number) {
  const trimmed = ledger.slice(0, MAX_LEDGER_ENTRIES);
  return {
    ledger: trimmed,
    events: trimmed,
    pointsHistory: trimmed,
    pointsAvailable,
    points: pointsAvailable,
  };
}

export const useRewardsStore = create<RewardsState>()(
  persist(
    (set, get) => ({
      pointsTotal: 0,
      pointsAvailable: 0,
      points: 0, // alias for pointsAvailable
      streakDays: 0,
      lastCheckInISO: null,
      ledger: [],
      events: [], // alias for ledger
      pointsHistory: [], // alias for ledger
      grants: {},
      dailyRoutinePoints: 0,
      lastRoutineDate: null,
      referralCount: 0,
      hasPerformedFirstAction: false,

      hasCheckedInToday: () => {
        // Delegates to the check-in store, which owns the daily record.
        return useCheckInStore.getState().hasCheckedInToday();
      },

      hasCompletedRoutineToday: () => {
        const date = get().lastRoutineDate;
        if (!date) return false;
        return dayjs(date).isSame(dayjs(), "day");
      },

      getDailyRoutinePointsRemaining: () => {
        const state = get();
        const today = dayjs().format("YYYY-MM-DD");
        
        // If it's a new day, reset daily points and return 5
        if (state.lastRoutineDate !== today) {
          return 5;
        }
        
        // Return remaining points for today
        return Math.max(0, 5 - state.dailyRoutinePoints);
      },

      earn: (delta, reason, meta, reversible = false, relatedActionId) => {
        // Validate the action before awarding points
        const validation = get().validateAction(reason, meta);
        if (!validation.valid) {
          return { ok: false, message: validation.message };
        }

        const currentState = get();
        
        // Check if this is the user's first action (not signup bonus)
        const isFirstUserAction = !currentState.hasPerformedFirstAction && reason !== "Sign up bonus" && delta > 0;
        const isFirstRoutineTask = reason === "daily_routine_task" && currentState.dailyRoutinePoints === 0 && delta > 0;
        const shouldTriggerFirstPointPopup = isFirstUserAction || isFirstRoutineTask;
        
        set((s) => {
          const entry: LedgerItem = {
            id: uid(),
            ts: Date.now(),
            delta,
            reason,
            meta,
            reversible,
            relatedActionId,
          };

          return {
            // pointsTotal is lifetime *earned*, so spending must not reduce it.
            pointsTotal: delta > 0 ? s.pointsTotal + delta : s.pointsTotal,
            hasPerformedFirstAction: shouldTriggerFirstPointPopup
              ? true
              : s.hasPerformedFirstAction,
            ...withAliases([entry, ...s.ledger], Math.max(0, s.pointsAvailable + delta)),
          };
        });
        
        const newState = get();
        
        // If this was the first action, sync to Supabase
        if (shouldTriggerFirstPointPopup) {
          FirstActionService.markFirstActionPerformed().catch(error => {
            console.warn('Failed to sync first action to Supabase:', error);
          });
        }
        
        // Trigger first point callback if this should trigger the popup
        if (shouldTriggerFirstPointPopup && newState.firstPointCallback) {
          newState.firstPointCallback();
        }
        
        return { ok: true, message: `Earned ${delta} points for ${reason}` };
      },

      checkIn: () => {
        
        if (get().hasCheckedInToday()) {
          return { ok: false, message: "Already checked in today." };
        }
        
        const state = get();

        // A streak is only continued when the previous check-in was yesterday.
        // This used to do `streakDays + 1` unconditionally, so a user who
        // checked in once a month still climbed toward a "7 day streak" bonus.
        const lastCheckIn = state.lastCheckInISO ? dayjs(state.lastCheckInISO) : null;
        const isConsecutive =
          !!lastCheckIn && lastCheckIn.isSame(dayjs().subtract(1, "day"), "day");
        const newStreakDays = isConsecutive ? state.streakDays + 1 : 1;
        const isSevenDayStreak = newStreakDays > 0 && newStreakDays % 7 === 0;

        set({
          lastCheckInISO: dayjs().toISOString(),
          streakDays: newStreakDays,
        });
        
        // Award 1 point for check-in (reversible)
        get().earn(1, "daily_check_in", { streakDays: newStreakDays }, true);
        
        // Award 2 bonus points for 7-day streaks (not reversible)
        if (isSevenDayStreak) {
          get().earn(2, "seven_day_streak_bonus", { streakDays: newStreakDays }, false);
          return { ok: true, message: `7-day streak! +3 points total (1 check-in + 2 bonus)` };
        }
        
        return { ok: true, message: "Checked in! +1 point" };
      },

      undoCheckIn: () => {
        const state = get();
        
        if (!state.hasCheckedInToday()) {
          return { ok: false, message: "No check-in to undo today" };
        }
        
        // Find today's check-in action
        const today = dayjs().format("YYYY-MM-DD");
        const checkInAction = state.ledger.find(item => 
          item.reason === "daily_check_in" && 
          item.delta > 0 &&
          dayjs(item.ts).format("YYYY-MM-DD") === today
        );
        
        if (!checkInAction) {
          return { ok: false, message: "No check-in action found for today" };
        }
        
        // Reverse the check-in action
        const result = get().reverseAction(checkInAction.id);
        if (!result.ok) {
          return { ok: false, message: result.message };
        }
        
        // Reset check-in state
        set((s) => ({
          lastCheckInISO: null,
          streakDays: Math.max(0, s.streakDays - 1),
        }));
        
        return { ok: true, message: "Check-in undone. -1 point" };
      },

      grantOnce: (key, delta, reason) => {
        const granted = get().grants[key];
        if (granted) return false;
        set((s) => ({ grants: { ...s.grants, [key]: true } }));
        get().earn(delta, reason);
        return true;
      },

      completeRoutineTask: (taskId) => {
        const state = get();
        const today = dayjs().format("YYYY-MM-DD");
        
        // Reset daily points if it's a new day
        if (state.lastRoutineDate !== today) {
          set((s) => ({
            dailyRoutinePoints: 0,
            lastRoutineDate: today,
          }));
        }
        
        const currentState = get();
        const remaining = currentState.getDailyRoutinePointsRemaining();
        
        if (remaining <= 0) {
          return { ok: false, message: "Daily routine points limit reached (5 points max)", points: 0 };
        }
        
        // Award 1 point for routine task completion
        const earnResult = get().earn(1, "daily_routine_task", { taskId }, true);
        
        if (!earnResult?.ok) {
          return { ok: false, message: earnResult?.message || "Daily routine points limit reached (5 points max)", points: 0 };
        }
        
        // Update daily routine points counter
        const points = 1;
        set((s) => ({
          dailyRoutinePoints: s.dailyRoutinePoints + points,
        }));
        
        // Check if this is the first routine step ever
        if (!currentState.grants.firstRoutineStep) {
          get().grantOnce("firstRoutineStep", 5, "first_routine_step_bonus");
          return { ok: true, message: `First routine step! +6 points total (1 task + 5 bonus)`, points: 6 };
        }
        
        return { ok: true, message: `Routine task completed! +${points} point`, points };
      },

      undoRoutineTask: (taskId) => {
        const state = get();
        const today = dayjs().format("YYYY-MM-DD");
        
        if (state.lastRoutineDate !== today || state.dailyRoutinePoints <= 0) {
          return { ok: false, message: "No routine points to undo today", points: 0 };
        }
        
        // Find the most recent routine task completion for this task today
        const recentAction = state.ledger.find(item => 
          item.reason === "daily_routine_task" && 
          item.meta?.taskId === taskId &&
          item.delta > 0 &&
          dayjs(item.ts).format("YYYY-MM-DD") === today
        );
        
        if (!recentAction) {
          return { ok: false, message: "No recent completion found for this task", points: 0 };
        }
        
        // Reverse the specific action
        const result = get().reverseAction(recentAction.id);
        
        if (!result.ok) {
          return { ok: false, message: result.message, points: 0 };
        }
        
        // Update daily routine points counter
        const points = 1;
        set((s) => ({
          dailyRoutinePoints: Math.max(0, s.dailyRoutinePoints - points),
        }));
        
        return { ok: true, message: `Routine task undone. -${points} point`, points: -points };
      },

      addReferral: () => {
        const state = get();
        
        if (state.referralCount >= 20) {
          return { ok: false, message: "Referral limit reached (20 friends max)" };
        }
        
        set((s) => ({
          referralCount: s.referralCount + 1,
        }));
        
        get().earn(20, "refer_friend", { referralNumber: state.referralCount + 1 });
        
        return { ok: true, message: "Friend referred! +20 points" };
      },

      validateAction: (reason, meta) => {
        const state = get();
        const now = Date.now();
        
        // Rate limiting: prevent rapid-fire actions
        const recentActions = state.ledger.filter(item => 
          now - item.ts < 1000 // Within last second
        );
        
        if (recentActions.length > 5) {
          return { valid: false, message: "Too many actions too quickly" };
        }
        
        // Validate specific action types
        switch (reason) {
          case "daily_check_in":
            if (state.hasCheckedInToday()) {
              return { valid: false, message: "Already checked in today" };
            }
            break;
            
          case "daily_routine_task":
            if (state.getDailyRoutinePointsRemaining() <= 0) {
              return { valid: false, message: "Daily routine points limit reached" };
            }
            break;
            
          case "refer_friend":
            if (state.referralCount >= 20) {
              return { valid: false, message: "Referral limit reached" };
            }
            break;
            
          case "post_engagement_likes":
          case "post_engagement_comments":
            // Prevent duplicate engagement rewards for same post
            const postId = meta?.postId;
            if (postId) {
              const existingEngagement = state.ledger.find(item => 
                item.reason === reason && item.meta?.postId === postId
              );
              if (existingEngagement) {
                return { valid: false, message: "Engagement already rewarded for this post" };
              }
            }
            break;
        }
        
        return { valid: true };
      },

      reverseAction: (actionId) => {
        const state = get();
        const action = state.ledger.find(item => item.id === actionId);
        
        if (!action) {
          return { ok: false, message: "Action not found" };
        }
        
        if (!action.reversible) {
          return { ok: false, message: "Action cannot be reversed" };
        }
        
        // Reversing the same action twice would double-debit the user.
        const alreadyReversed = state.ledger.some(
          (item) => item.meta?.originalActionId === actionId
        );
        if (alreadyReversed) {
          return { ok: false, message: "Action already reversed" };
        }

        const reversal: LedgerItem = {
          id: uid(),
          ts: Date.now(),
          delta: -action.delta,
          reason: `${action.reason}_reversed`,
          meta: { originalActionId: actionId, ...action.meta },
          reversible: false,
        };

        set((s) => ({
          pointsTotal: Math.max(0, s.pointsTotal - action.delta),
          ...withAliases([reversal, ...s.ledger], Math.max(0, s.pointsAvailable - action.delta)),
        }));
        
        return { ok: true, message: "Action reversed successfully" };
      },

      setFirstPointCallback: (callback) => {
        set({ firstPointCallback: callback });
      },

      setSignupBonusCallback: (callback) => {
        set({ signupBonusCallback: callback });
      },

      awardSignupBonus: () => {
        const currentState = get();
        
        // Check if signup bonus has already been awarded
        if (currentState.grants.signupBonus) {
          return false; // Already awarded
        }

        // Award the signup bonus
        const success = get().grantOnce("signupBonus", 250, "Sign up bonus");
        
        return success;
      },

      resetAll: () =>
        set({
          pointsTotal: 0,
          pointsAvailable: 0,
          points: 0,
          streakDays: 0,
          lastCheckInISO: null,
          ledger: [],
          events: [],
          pointsHistory: [],
          grants: {},
          dailyRoutinePoints: 0,
          lastRoutineDate: null,
          referralCount: 0,
          firstPointCallback: undefined,
          signupBonusCallback: undefined,
          hasPerformedFirstAction: false,
        }),

      syncFirstActionState: async () => {
        try {
          await FirstActionService.markFirstActionPerformed();
        } catch (error) {
          console.warn('Failed to sync first action state:', error);
        }
      },

      addPoints: (points: number) => {
        get().earn(points, "legacy_add_points");
      },
    }),
    {
      name: "rewards:v2",
      storage: createJSONStorage(() => AsyncStorage),
      // Persist only durable state. `ledger` is the source of truth; `events`
      // and `pointsHistory` are aliases of it and were being written to disk
      // three times over, and the two callbacks are functions that JSON cannot
      // round-trip anyway.
      partialize: (s) => ({
        pointsTotal: s.pointsTotal,
        pointsAvailable: s.pointsAvailable,
        streakDays: s.streakDays,
        lastCheckInISO: s.lastCheckInISO,
        ledger: s.ledger,
        grants: s.grants,
        dailyRoutinePoints: s.dailyRoutinePoints,
        lastRoutineDate: s.lastRoutineDate,
        referralCount: s.referralCount,
        hasPerformedFirstAction: s.hasPerformedFirstAction,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Rebuild the aliases from the persisted ledger.
        const ledger = state.ledger ?? [];
        useRewardsStore.setState({
          events: ledger,
          pointsHistory: ledger,
          points: state.pointsAvailable ?? 0,
        });
      },
    }
  )
);

// (Optional) Quick tier helper if you want it elsewhere.
export function getTier(points: number) {
  if (points >= 1000) return { name: "Platinum", nextAt: null, toNext: 0 };
  if (points >= 500)  return { name: "Gold",     nextAt: 1000, toNext: 1000 - points };
  if (points >= 250)  return { name: "Silver",   nextAt: 500,  toNext: 500 - points };
  return { name: "Bronze", nextAt: 250, toNext: 250 - points };
}
