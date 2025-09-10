import { create } from "zustand";

export type Answers = {
  persona: "menopause" | "postpartum" | "general";
  hairType: string;         // e.g., "fine-straight"
  washFreq: string;         // e.g., "2x/week"
  goals: string[];          // e.g., ["reduce shedding","increase fullness"]
  constraints?: string;     // e.g., "color-treated; avoid sulfates"
};

type S = {
  answers: Partial<Answers>;
  setAnswers: (patch: Partial<Answers>) => void;
  reset: () => void;
};

export const useAnswersStore = create<S>((set) => ({
  answers: {},
  setAnswers: (patch) => set((s) => ({ answers: { ...s.answers, ...patch } })),
  reset: () => set({ answers: {} }),
}));
