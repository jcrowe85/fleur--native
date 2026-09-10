// src/state/recommendationsStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * This is the shape you (or onboarding) should save after the questionnaire
 * /summary → recommendations flow. Keep it simple & local until “backup”.
 */
export type Recommendation = {
  id: string;                 // stable id for this recommendation
  title: string;              // human name of the action/step
  product?: string;           // e.g., "Fleur Night Repair"
  timeOfDay?: "morning" | "evening" | "night" | "weekly";
  frequency?: "Daily" | "3x/week" | "Weekly" | "Bi-weekly" | "Monthly";
  time?: string;              // "8:00 AM" etc. (optional)
  instructions?: string;      // light how-to text
  durationMin?: number;       // cosmetics/UX only
  enabled?: boolean;          // default true unless you want it off by default
};

type RecommendationsState = {
  items: Recommendation[];
  setRecommendations: (items: Recommendation[]) => void;
  clear: () => void;
};

export const useRecommendationsStore = create<RecommendationsState>()(
  persist(
    (set) => ({
      items: [],
      setRecommendations: (items) => set({ items }),
      clear: () => set({ items: [] }),
    }),
    {
      name: "recs:v1",
      // Without an explicit storage this silently no-ops in React Native
      // (persist defaults to localStorage): recommendations were dropped on
      // every restart, and persist.clearStorage() threw "Cannot read property
      // 'removeItem' of undefined", which broke the dev reset partway through.
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ items: state.items }),
    }
  )
);
