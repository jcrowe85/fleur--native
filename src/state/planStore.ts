// src/state/planStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { FleurPlan } from "@/types/plan";

type S = {
  plan: FleurPlan | null;
  setPlan: (p: FleurPlan) => void;
  clearPlan: () => void;

  /** true after zustand has rehydrated from disk */
  _hydrated: boolean;
};

export const usePlanStore = create<S>()(
  persist(
    (set) => ({
      plan: null,
      setPlan: (plan) => set({ plan }),
      clearPlan: () => set({ plan: null }),
      _hydrated: false,
    }),
    {
      name: "fleur-plan-v1",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist plan (not _hydrated)
      partialize: (s) => ({ plan: s.plan }),
    }
  )
);

// Flip _hydrated once persistence finishes so the app can gate routing.
usePlanStore.persist?.onFinishHydration?.(() => {
  usePlanStore.setState({ _hydrated: true });
});
