import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Answers = Record<string, string[]>;

type OnboardingState = {
  answers: Answers;
  setAnswers: (patch: Partial<Answers>) => void;          // merge by key
  setAnswerFor: (id: string, values: string[]) => void;   // convenience
  reset: () => void;                                      // clear after plan build
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      answers: {},

      setAnswers: (patch) =>
        set((s) => ({ answers: { ...s.answers, ...patch } })),

      setAnswerFor: (id, values) =>
        set((s) => ({ answers: { ...s.answers, [id]: values } })),

      reset: () => set({ answers: {} }),
    }),
    {
      name: "onboarding-v1",
      storage: createJSONStorage(() => AsyncStorage),
      // Persist only the answers; nothing else to keep around
      partialize: (s) => ({ answers: s.answers }),
    }
  )
);
