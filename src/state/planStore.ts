import { create } from "zustand";
import type { FleurPlan } from "@/types/plan";

type S = {
  plan: FleurPlan | null;
  setPlan: (p: FleurPlan) => void;
  clearPlan: () => void;
};

export const usePlanStore = create<S>((set) => ({
  plan: null,
  setPlan: (plan) => set({ plan }),
  clearPlan: () => set({ plan: null }),
}));
