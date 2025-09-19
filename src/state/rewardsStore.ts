// src/state/rewardsStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import dayjs from "dayjs";

type LedgerItem = {
  id: string;             // uuid-ish
  ts: number;             // epoch ms
  delta: number;          // +points or -points
  reason: string;         // "daily_check_in", "start_routine", "first_post", "redeem", etc.
  meta?: Record<string, any>;
};

type Grants = {
  startedRoutine?: boolean;  // awarded once when user completes routine setup
  firstPost?: boolean;       // awarded once after first post
};

type RewardsState = {
  pointsTotal: number;       // lifetime points earned (you can use for tiers if you like)
  pointsAvailable: number;   // spendable points shown in UI
  streakDays: number;
  lastCheckInISO: string | null;
  ledger: LedgerItem[];
  grants: Grants;

  // derived helpers (lightweight)
  hasCheckedInToday: () => boolean;

  // core mutations
  earn: (delta: number, reason: string, meta?: Record<string, any>) => void;
  checkIn: () => { ok: boolean; message: string };
  grantOnce: (key: keyof Grants, delta: number, reason: string) => boolean;

  // admin/debug helpers (optionally use in dev menu)
  resetAll: () => void;
};

function uid() {
  return Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
}

export const useRewardsStore = create<RewardsState>()(
  persist(
    (set, get) => ({
      pointsTotal: 0,
      pointsAvailable: 0,
      streakDays: 0,
      lastCheckInISO: null,
      ledger: [],
      grants: {},

      hasCheckedInToday: () => {
        const iso = get().lastCheckInISO;
        if (!iso) return false;
        return dayjs(iso).isSame(dayjs(), "day");
      },

      earn: (delta, reason, meta) =>
        set((s) => ({
          pointsTotal: Math.max(0, s.pointsTotal + delta),
          pointsAvailable: Math.max(0, s.pointsAvailable + delta),
          ledger: [{ id: uid(), ts: Date.now(), delta, reason, meta }, ...s.ledger].slice(0, 200),
        })),

      checkIn: () => {
        if (get().hasCheckedInToday()) {
          return { ok: false, message: "Already checked in today." };
        }
        set((s) => ({
          lastCheckInISO: dayjs().toISOString(),
          streakDays: s.streakDays + 1,
        }));
        get().earn(1, "daily_check_in");
        return { ok: true, message: "Checked in! +1 point" };
      },

      grantOnce: (key, delta, reason) => {
        const granted = get().grants[key];
        if (granted) return false;
        set((s) => ({ grants: { ...s.grants, [key]: true } }));
        get().earn(delta, reason);
        return true;
      },

      resetAll: () =>
        set({
          pointsTotal: 0,
          pointsAvailable: 0,
          streakDays: 0,
          lastCheckInISO: null,
          ledger: [],
          grants: {},
        }),
    }),
    { name: "rewards:v1" }
  )
);

// (Optional) Quick tier helper if you want it elsewhere.
export function getTier(points: number) {
  if (points >= 1000) return { name: "Platinum", nextAt: null, toNext: 0 };
  if (points >= 500)  return { name: "Gold",     nextAt: 1000, toNext: 1000 - points };
  if (points >= 250)  return { name: "Silver",   nextAt: 500,  toNext: 500 - points };
  return { name: "Bronze", nextAt: 250, toNext: 250 - points };
}
