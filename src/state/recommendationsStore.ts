// src/state/recommendationsStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

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
    { name: "recs:v1" }
  )
);
