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
  lastPopupShownDate: string | null; // YYYY-MM-DD format
  
  // Actions
  addCheckIn: (data: Omit<DailyCheckIn, "id" | "date" | "timestamp">) => void;
  getCheckInForDate: (date: string) => DailyCheckIn | null;
  hasCheckedInToday: () => boolean;
  getLast7DaysAverage: () => {
    scalpCondition: ScalpCondition | null;
    hairShedding: HairShedding | null;
    overallFeeling: OverallFeeling | null;
  };
  
  // Popup logic
  shouldShowDailyPopup: () => boolean;
  markPopupShown: () => void;
  
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
      lastPopupShownDate: null,

      addCheckIn: (data) => {
        const today = dayjs().format("YYYY-MM-DD");
        const existingCheckIn = get().getCheckInForDate(today);
        
        if (existingCheckIn) {
          // Update existing check-in for today
          set((state) => {
            const existingCheckIns = Array.isArray(state.checkIns) ? state.checkIns : [];
            return {
              checkIns: existingCheckIns.map((checkIn) =>
                checkIn.date === today
                  ? { ...checkIn, ...data, timestamp: Date.now() }
                  : checkIn
              ),
            };
          });
        } else {
          // Add new check-in
          const newCheckIn: DailyCheckIn = {
            id: uid(),
            date: today,
            timestamp: Date.now(),
            ...data,
          };
          set((state) => {
            const existingCheckIns = Array.isArray(state.checkIns) ? state.checkIns : [];
            return {
              checkIns: [newCheckIn, ...existingCheckIns].slice(0, 365), // Keep last year
            };
          });
        }
      },

      getCheckInForDate: (date) => {
        const checkIns = get().checkIns;
        if (!checkIns || !Array.isArray(checkIns)) {
          return null;
        }
        return checkIns.find((checkIn) => checkIn.date === date) || null;
      },

      hasCheckedInToday: () => {
        const today = dayjs().format("YYYY-MM-DD");
        return get().getCheckInForDate(today) !== null;
      },

      getLast7DaysAverage: () => {
        const last7Days = Array.from({ length: 7 }, (_, i) =>
          dayjs().subtract(i, "day").format("YYYY-MM-DD")
        );
        
        const checkIns = get().checkIns;
        if (!checkIns || !Array.isArray(checkIns)) {
          return {
            scalpCondition: null,
            hairShedding: null,
            overallFeeling: null,
          };
        }
        
        const recentCheckIns = checkIns.filter((checkIn) =>
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

      shouldShowDailyPopup: () => {
        const now = dayjs();
        const currentHour = now.hour();
        const today = now.format("YYYY-MM-DD");
        const state = get();
        
        // Don't show if already checked in today
        if (state.hasCheckedInToday()) {
          return false;
        }
        
        // Don't show if popup was already shown today
        if (state.lastPopupShownDate === today) {
          return false;
        }
        
        // Don't show on first login - too many popups happening (signup bonus, first point, etc.)
        // Check if this is the user's first time by looking at check-in history
        if (state.checkIns.length === 0) {
          return false;
        }
        
        // Check if this is a new day (after midnight) and before 4am
        // If popup was shown yesterday and it's now a new day before 4am, don't show
        if (currentHour < 4) {
          const yesterday = dayjs().subtract(1, 'day').format("YYYY-MM-DD");
          if (state.lastPopupShownDate === yesterday) {
            // Popup was shown yesterday, and it's now a new day before 4am
            // Don't show until after 4am
            return false;
          }
        }
        
        return true;
      },

      markPopupShown: () => {
        const today = dayjs().format("YYYY-MM-DD");
        set({ lastPopupShownDate: today });
      },

      resetAll: () => set({ checkIns: [], lastPopupShownDate: null }),
      
      // Debug helper - clear today's check-in only
      clearTodaysCheckIn: () => {
        const today = dayjs().format("YYYY-MM-DD");
        set((state) => {
          const existingCheckIns = Array.isArray(state.checkIns) ? state.checkIns : [];
          return {
            checkIns: existingCheckIns.filter((checkIn) => checkIn.date !== today),
          };
        });
      },
    }),
    { name: "checkin:v1" }
  )
);
