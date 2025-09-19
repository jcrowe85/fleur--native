import { create } from "zustand";
import { persist } from "zustand/middleware";
import dayjs from "dayjs";

export type Period = "morning" | "evening" | "weekly";

export type RoutineStep = {
  id: string;
  name: string;
  time?: string;            // "8:00 AM"
  frequency?: string;       // "Daily" | "3x/week" | "Weekly"
  period?: Period;          // optional explicit period (overrides inference)
  enabled: boolean;
  instructions?: string;
  product?: string;
  icon?: string;            // Feather icon name, e.g. "droplet"
};

type CompletedMap = Record<string /* yyyy-mm-dd */, Record<string /* stepId */, true>>;

type RoutineState = {
  steps: RoutineStep[];
  completedByDate: CompletedMap;

  // derived helpers
  todayKey: () => string;
  isCompletedToday: (stepId: string) => boolean;

  // queries
  stepsByPeriod: (p: Period) => RoutineStep[];

  // mutations
  setSteps: (steps: RoutineStep[]) => void;
  upsertStep: (s: RoutineStep) => void;
  removeStep: (id: string) => void;
  toggleStepToday: (id: string) => boolean; // returns isNowCompleted
  applyDefaultIfEmpty: () => void;

  resetAll: () => void;
};

// quick id
function uid() {
  return Math.random().toString(36).slice(2, 8) + "-" + Date.now().toString(36);
}

// naive inference if period not provided
function inferPeriod(s: RoutineStep): Period {
  if ((s.frequency || "").toLowerCase().includes("weekly")) return "weekly";
  const t = (s.time || "").toLowerCase();
  if (!t) return "morning";
  if (t.includes("am")) return "morning";
  return "evening";
}

const DEFAULT_STEPS: RoutineStep[] = [
  {
    id: uid(),
    name: "Peptide Growth Serum",
    time: "8:00 AM",
    frequency: "Daily",
    period: "morning",
    enabled: true,
    instructions: "Apply 3–4 drops to clean scalp.",
    product: "Fleur Growth Complex",
    icon: "droplet",
  },
  {
    id: uid(),
    name: "Gentle Scalp Massage",
    time: "8:05 AM",
    frequency: "Daily",
    period: "morning",
    enabled: true,
    instructions: "Massage in circular motions for 3 minutes.",
    product: "Massage technique",
    icon: "zap",
  },
  {
    id: uid(),
    name: "Derma-stamp Application",
    time: "8:00 PM",
    frequency: "3x/week",
    period: "evening",
    enabled: true,
    instructions: "Use 0.5mm derma-stamp on clean scalp.",
    product: "Derma-stamp tool",
    icon: "activity",
  },
  {
    id: uid(),
    name: "Intensive Night Serum",
    time: "10:00 PM",
    frequency: "Daily",
    period: "evening",
    enabled: true,
    instructions: "Apply repair serum for overnight treatment.",
    product: "Fleur Night Repair",
    icon: "moon",
  },
];

export const useRoutineStore = create<RoutineState>()(
  persist(
    (set, get) => ({
      steps: [],
      completedByDate: {},

      todayKey: () => dayjs().format("YYYY-MM-DD"),

      isCompletedToday: (stepId) => {
        const k = get().todayKey();
        return !!get().completedByDate[k]?.[stepId];
      },

      stepsByPeriod: (p) => {
        const src = get().steps;
        return src
          .filter((s) => s.enabled)
          .filter((s) => (s.period ? s.period === p : inferPeriod(s) === p));
      },

      setSteps: (steps) => set({ steps }),

      upsertStep: (s) =>
        set((state) => {
          const idx = state.steps.findIndex((x) => x.id === s.id);
          const next = [...state.steps];
          if (idx >= 0) next[idx] = s;
          else next.unshift(s);
          return { steps: next };
        }),

      removeStep: (id) =>
        set((state) => ({ steps: state.steps.filter((s) => s.id !== id) })),

      toggleStepToday: (id) => {
        const k = get().todayKey();
        const map = { ...(get().completedByDate[k] || {}) };
        const nowCompleted = !map[id];
        if (nowCompleted) map[id] = true;
        else delete map[id];
        set((s) => ({
          completedByDate: {
            ...s.completedByDate,
            [k]: map,
          },
        }));
        return nowCompleted;
      },

      applyDefaultIfEmpty: () => {
        if (get().steps.length === 0) set({ steps: DEFAULT_STEPS });
      },

      resetAll: () => set({ steps: [], completedByDate: {} }),
    }),
    { name: "routine:v1" }
  )
);
