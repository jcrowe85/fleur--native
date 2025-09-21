// src/state/checkinStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import dayjs from "dayjs";

export type ScalpCondition = "dry" | "balanced" | "oily";
export type HairShedding = "low" | "medium" | "high";
export type OverallFeeling = "not_great" | "okay" | "great";

export type DailyCheckIn = {
  id: string;
  date: string; // YYYY-MM-DD format
  scalpCondition: ScalpCondition;
  hairShedding: HairShedding;
  overallFeeling: OverallFeeling;
  timestamp: number;
};

type CheckInState = {
  checkIns: DailyCheckIn[];
  
  // Actions
  addCheckIn: (data: Omit<DailyCheckIn, "id" | "date" | "timestamp">) => void;
  getCheckInForDate: (date: string) => DailyCheckIn | null;
  hasCheckedInToday: () => boolean;
  getLast7DaysAverage: () => {
    scalpCondition: ScalpCondition | null;
    hairShedding: HairShedding | null;
    overallFeeling: OverallFeeling | null;
  };
  
  // Admin
  resetAll: () => void;
  clearTodaysCheckIn: () => void;
};

function uid() {
  return Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
}

export const useCheckInStore = create<CheckInState>()(
  persist(
    (set, get) => ({
      checkIns: [],

      addCheckIn: (data) => {
        const today = dayjs().format("YYYY-MM-DD");
        const existingCheckIn = get().getCheckInForDate(today);
        
        if (existingCheckIn) {
          // Update existing check-in for today
          set((state) => ({
            checkIns: state.checkIns.map((checkIn) =>
              checkIn.date === today
                ? { ...checkIn, ...data, timestamp: Date.now() }
                : checkIn
            ),
          }));
        } else {
          // Add new check-in
          const newCheckIn: DailyCheckIn = {
            id: uid(),
            date: today,
            timestamp: Date.now(),
            ...data,
          };
          set((state) => ({
            checkIns: [newCheckIn, ...state.checkIns].slice(0, 365), // Keep last year
          }));
        }
      },

      getCheckInForDate: (date) => {
        return get().checkIns.find((checkIn) => checkIn.date === date) || null;
      },

      hasCheckedInToday: () => {
        const today = dayjs().format("YYYY-MM-DD");
        return get().getCheckInForDate(today) !== null;
      },

      getLast7DaysAverage: () => {
        const last7Days = Array.from({ length: 7 }, (_, i) =>
          dayjs().subtract(i, "day").format("YYYY-MM-DD")
        );
        
        const recentCheckIns = get().checkIns.filter((checkIn) =>
          last7Days.includes(checkIn.date)
        );

        if (recentCheckIns.length === 0) {
          return {
            scalpCondition: null,
            hairShedding: null,
            overallFeeling: null,
          };
        }

        // Calculate most common values
        const scalpCounts = { dry: 0, balanced: 0, oily: 0 };
        const sheddingCounts = { low: 0, medium: 0, high: 0 };
        const feelingCounts = { not_great: 0, okay: 0, great: 0 };

        recentCheckIns.forEach((checkIn) => {
          scalpCounts[checkIn.scalpCondition]++;
          sheddingCounts[checkIn.hairShedding]++;
          feelingCounts[checkIn.overallFeeling]++;
        });

        const getMostCommon = (counts: Record<string, number>) => {
          return Object.entries(counts).reduce((a, b) => (counts[a[0]] > counts[b[0]] ? a : b))[0];
        };

        return {
          scalpCondition: getMostCommon(scalpCounts) as ScalpCondition,
          hairShedding: getMostCommon(sheddingCounts) as HairShedding,
          overallFeeling: getMostCommon(feelingCounts) as OverallFeeling,
        };
      },

      resetAll: () => set({ checkIns: [] }),
      
      // Debug helper - clear today's check-in only
      clearTodaysCheckIn: () => {
        const today = dayjs().format("YYYY-MM-DD");
        set((state) => ({
          checkIns: state.checkIns.filter((checkIn) => checkIn.date !== today),
        }));
      },
    }),
    { name: "checkin:v1" }
  )
);
