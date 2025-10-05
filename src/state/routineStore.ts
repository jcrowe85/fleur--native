// src/state/routineStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSafeStorage } from "../utils/safeStorage";
import dayjs from "dayjs";
// Conditional import for notification service
let notificationService: any = null;
try {
  notificationService = require("@/services/notificationService").notificationService;
} catch (error) {
  console.warn('Notification service not available');
}

export type Period = "morning" | "evening" | "weekly";
export type Frequency = "Daily" | "3x/week" | "Weekly" | "Custom";

export type RoutineStep = {
  id: string;
  name: string;
  enabled: boolean;
  period?: Period;        // morning/evening/weekly (weekly for “treatments”)
  time?: string;          // "8:00 AM"
  frequency?: Frequency;  // Daily | 3x/week | Weekly | Custom
  days?: number[];        // 0=Sun..6=Sat (if omitted, implied by frequency)
  instructions?: string;
  product?: string;
  icon?: string;          // Feather icon name
};

type CompletedMap = Record<string /* yyyy-mm-dd */, Record<string /* stepId */, true>>;

type RoutineState = {
  steps: RoutineStep[];
  completedByDate: CompletedMap;
  hasSeenScheduleIntro: boolean;
  lastSavedFromScheduling: number | null; // timestamp when last saved from scheduling
  hasBeenCustomized: boolean; // true once user has customized their routine
  hasBuiltFromPlan: boolean; // true once we've built routine from LLM plan

  // derived
  todayKey: () => string;
  isCompletedToday: (stepId: string) => boolean;

  // weekly helpers (per arbitrary date)
  isCompletedOn: (stepId: string, iso: string) => boolean;
  toggleStepOn: (stepId: string, iso: string) => boolean;

  // queries
  stepsByPeriod: (p: Period) => RoutineStep[];

  // mutations
  setSteps: (steps: RoutineStep[]) => void;
  updateStep: (id: string, patch: Partial<RoutineStep>) => void;
  replaceSteps: (steps: RoutineStep[]) => void;
  bulkApply: (patch: Partial<RoutineStep>) => void;
  upsertStep: (s: RoutineStep) => void;
  removeStep: (id: string) => void;
  toggleStepToday: (id: string) => boolean; // returns isNowCompleted
  applyDefaultIfEmpty: () => void;
  buildFromPlan: (plan: any) => void;
  updateRoutineFromScheduling: (routineSteps: RoutineStep[]) => void;
  markPlanBuilt: () => void;
  markScheduleIntroSeen: () => void;
  scheduleNotifications: () => Promise<void>;
  resetAll: () => void;
  resetAllForDev: () => void; // Dev function that bypasses all protections
  clearStorage: () => Promise<void>;
};

// quick id
function uid() {
  return Math.random().toString(36).slice(2, 8) + "-" + Date.now().toString(36);
}

// default days helper
function defaultDaysForFrequency(freq?: Frequency): number[] | undefined {
  if (!freq || freq === "Daily") return [0,1,2,3,4,5,6];
  if (freq === "Weekly") return [1];         // Monday by default
  if (freq === "3x/week") return [1,3,5];    // Mon/Wed/Fri default
  return undefined; // Custom → user picks
}

// Product mapping from handles to routine information
const PRODUCT_ROUTINE_MAP: Record<string, {
  name: string;
  period: Period;
  frequency: Frequency;
  time: string;
  icon: string;
  defaultInstructions: string;
}> = {
  "bloom": {
    name: "Hair Growth Serum",
    period: "morning",
    frequency: "Daily",
    time: "8:00 AM",
    icon: "droplet",
    defaultInstructions: "Apply 3-4 drops to clean scalp, focusing on thinning areas."
  },
  "micro-roller": {
    name: "Derma Stamp Application",
    period: "evening",
    frequency: "3x/week",
    time: "8:00 PM",
    icon: "activity",
    defaultInstructions: "Use 0.5mm derma-stamp on clean scalp in circular motions."
  },
  "shampoo": {
    name: "Gentle Shampoo",
    period: "morning",
    frequency: "Daily",
    time: "7:30 AM",
    icon: "zap",
    defaultInstructions: "Massage into wet hair and scalp for 2-3 minutes, then rinse thoroughly."
  },
  "conditioner": {
    name: "Nourishing Conditioner",
    period: "morning",
    frequency: "Daily",
    time: "7:35 AM",
    icon: "heart",
    defaultInstructions: "Apply to mid-lengths and ends, leave for 2-3 minutes, then rinse."
  },
  "hair-mask": {
    name: "Repair Hair Mask",
    period: "weekly",
    frequency: "Weekly",
    time: "8:00 PM",
    icon: "star",
    defaultInstructions: "Apply to damp hair, leave for 10-15 minutes, then rinse thoroughly."
  },
  "heat-shield": {
    name: "Heat Protectant",
    period: "morning",
    frequency: "Daily",
    time: "7:40 AM",
    icon: "shield",
    defaultInstructions: "Spray on damp hair before heat styling to protect from damage."
  },
  "detangling-comb": {
    name: "Gentle Detangling",
    period: "morning",
    frequency: "Daily",
    time: "7:45 AM",
    icon: "feather",
    defaultInstructions: "Use wide-tooth comb to gently detangle from ends to roots."
  },
  "vegan-biotin": {
    name: "Biotin Supplement",
    period: "morning",
    frequency: "Daily",
    time: "8:30 AM",
    icon: "coffee",
    defaultInstructions: "Take with breakfast to support hair growth and strength."
  },
  "iron": {
    name: "Iron Supplement",
    period: "morning",
    frequency: "Daily",
    time: "8:30 AM",
    icon: "coffee",
    defaultInstructions: "Take with breakfast to support healthy hair growth."
  },
  "vitamin-d3": {
    name: "Vitamin D3 Supplement",
    period: "morning",
    frequency: "Daily",
    time: "8:30 AM",
    icon: "coffee",
    defaultInstructions: "Take with breakfast to support overall hair health."
  },
  "silk-pillow": {
    name: "Silk Pillowcase Care",
    period: "evening",
    frequency: "Daily",
    time: "10:00 PM",
    icon: "moon",
    defaultInstructions: "Sleep on silk pillowcase to reduce friction and breakage."
  }
};

// Build routine steps from user's personalized plan
export function buildRoutineFromPlan(plan: any): RoutineStep[] {
  if (!plan?.recommendations) return [];
  
  const steps: RoutineStep[] = [];
  
  // Create routine steps for each recommended product
  plan.recommendations.forEach((rec: any) => {
    const productInfo = PRODUCT_ROUTINE_MAP[rec.handle];
    if (!productInfo) return;
    
    const step: RoutineStep = {
      id: uid(),
      name: productInfo.name,
      period: productInfo.period,
      time: productInfo.time,
      frequency: productInfo.frequency,
      days: defaultDaysForFrequency(productInfo.frequency),
      enabled: true,
      instructions: rec.howToUse || productInfo.defaultInstructions,
      product: rec.title,
      icon: productInfo.icon,
    };
    
    steps.push(step);
  });
  
  return steps;
}

// naive inference if period not provided
export function inferPeriod(s: RoutineStep): Period {
  if ((s.frequency || "").toLowerCase().includes("weekly")) return "weekly";
  const t = (s.time || "").toLowerCase();
  if (!t) return "morning";
  if (t.includes("am")) return "morning";
  return "evening";
}

const DEFAULT_STEPS: RoutineStep[] = [
  {
    id: uid(),
    name: "Hair Growth Serum",
    time: "8:00 AM",
    frequency: "Daily",
    period: "morning",
    days: defaultDaysForFrequency("Daily"),
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
    days: defaultDaysForFrequency("Daily"),
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
    days: defaultDaysForFrequency("3x/week"),
    enabled: true,
    instructions: "Use 0.5mm derma-stamp on clean scalp.",
    product: "Derma-stamp tool",
    icon: "activity",
  },
  {
    id: uid(),
    name: "Hair Growth Serum",
    time: "10:00 PM",
    frequency: "Daily",
    period: "evening",
    days: defaultDaysForFrequency("Daily"),
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
      hasSeenScheduleIntro: false,
      lastSavedFromScheduling: null,
      hasBeenCustomized: false,
      hasBuiltFromPlan: false,

      todayKey: () => dayjs().format("YYYY-MM-DD"),

      isCompletedToday: (stepId) => {
        const k = get().todayKey();
        return !!get().completedByDate[k]?.[stepId];
      },

      isCompletedOn: (stepId, iso) => {
        return !!get().completedByDate[iso]?.[stepId];
      },

      toggleStepOn: (stepId, iso) => {
        const map = { ...(get().completedByDate[iso] || {}) };
        const nowCompleted = !map[stepId];
        if (nowCompleted) map[stepId] = true;
        else delete map[stepId];
        set((s) => ({
          completedByDate: {
            ...s.completedByDate,
            [iso]: map,
          },
        }));
        return nowCompleted;
      },

      stepsByPeriod: (p) => {
        const src = get().steps;
        const filtered = src
          .filter((s) => s.enabled)
          .filter((s) => (s.period ? s.period === p : inferPeriod(s) === p));
        
        // Sort by time (earliest first)
        const sorted = filtered.sort((a, b) => {
          const timeA = a.time || "23:59";
          const timeB = b.time || "23:59";
          return timeA.localeCompare(timeB);
        });
        
        return sorted;
      },

      setSteps: (steps) => set({ steps }),

      updateStep: (id, patch) =>
        set((state) => {
          console.log("🔄 updateStep: Updating routine step:", id);
          return {
            steps: state.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)),
            hasBeenCustomized: true // Mark as customized when user makes changes
          };
        }),

      replaceSteps: (steps) => set({ steps }),

      bulkApply: (patch) =>
        set((s) => ({
          steps: s.steps.map((x) => ({ ...x, ...patch })),
        })),

      upsertStep: (s) =>
        set((state) => {
          console.log("🔄 upsertStep: Updating routine step:", s.name);
          const idx = state.steps.findIndex((x) => x.id === s.id);
          const next = [...state.steps];
          if (idx >= 0) next[idx] = s;
          else next.unshift(s);
          
          // Mark routine as customized when user makes changes
          return { 
            steps: next,
            hasBeenCustomized: true // Ensure this is set when user modifies routine
          };
        }),

      removeStep: (id) => {
        console.log("🗑️ removeStep: Removing routine step:", id);
        
        // First, reverse any points earned from this step
        const { onRoutineStepDeleted } = require("@/services/rewards");
        const result = onRoutineStepDeleted(id);
        
        // Log the result for debugging
        if (result.ok && result.points !== 0) {
          console.log(`Routine step deleted: ${result.message}`);
        }
        
        // Then remove the step from the routine
        set((state) => ({ 
          steps: state.steps.filter((s) => s.id !== id),
          hasBeenCustomized: true // Mark as customized when user makes changes
        }));
      },

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

      buildFromPlan: (plan: any) => {
        const currentState = get();
        
        console.log("🔍 buildFromPlan called (one-time only during onboarding):", {
          stepsCount: currentState.steps.length,
          planHasRoutineSteps: !!plan?.routineSteps,
          planHasRecommendations: !!plan?.recommendations
        });
        
        // If plan has routineSteps (from scheduling), use those directly
        if (plan?.routineSteps && Array.isArray(plan.routineSteps)) {
          set({ 
            steps: plan.routineSteps,
            lastSavedFromScheduling: Date.now(),
            hasBeenCustomized: true // Mark as customized since user saved from scheduling
          });
        } else {
          // Build from LLM recommendations (only during onboarding)
          const personalizedSteps = buildRoutineFromPlan(plan);
          if (personalizedSteps.length > 0) {
            console.log("✅ buildFromPlan: Building routine from LLM recommendations");
            set({ steps: personalizedSteps });
          } else {
            // Fallback to default steps if no personalized recommendations
            console.log("⚠️ buildFromPlan: No personalized steps, using defaults");
            get().applyDefaultIfEmpty();
          }
        }
        
        // Mark as built (this should only happen once during onboarding)
        get().markPlanBuilt();
      },

      // Separate method for scheduling updates (always allowed)
      updateRoutineFromScheduling: (routineSteps: RoutineStep[]) => {
        console.log("📅 updateRoutineFromScheduling: Updating routine from scheduling");
        set({ 
          steps: routineSteps,
          lastSavedFromScheduling: Date.now(),
          hasBeenCustomized: true // Mark as customized since user scheduled it
        });
      },

        markPlanBuilt: () => {
          console.log("✅ markPlanBuilt: Setting hasBuiltFromPlan = true");
          set({ hasBuiltFromPlan: true });
        },

        markScheduleIntroSeen: () => {
          set({ hasSeenScheduleIntro: true });
        },
      
      scheduleNotifications: async () => {
        try {
          if (notificationService) {
            const { steps } = get();
            await notificationService.scheduleRoutineNotifications(steps);
          }
        } catch (error) {
          console.error('Failed to schedule routine notifications:', error);
        }
      },
      
      resetAll: () => {
        const currentState = get();
        // If user has custom steps, preserve them during reset
        const hasCustomSteps = currentState.steps.length > 0 && 
          !currentState.steps.every(step => 
            step.name === "Hair Growth Serum" || 
            step.name === "Gentle Scalp Massage" ||
            step.product === "Fleur Growth Complex"
          );
        
        if (hasCustomSteps) {
          // Keep custom steps and mark as customized
          // IMPORTANT: Preserve hasBuiltFromPlan to prevent routine rebuilding
          set({ 
            completedByDate: {}, 
            hasSeenScheduleIntro: false, 
            hasBeenCustomized: true,
            hasBuiltFromPlan: currentState.hasBuiltFromPlan // Preserve this flag
          });
        } else {
          // Reset everything for new users
          set({ 
            steps: [], 
            completedByDate: {}, 
            hasSeenScheduleIntro: false, 
            hasBeenCustomized: false, 
            hasBuiltFromPlan: false 
          });
        }
      },

      // DEV FUNCTION: Complete reset that bypasses all protections
      resetAllForDev: () => {
        console.log("🧪 DEV: Complete routine reset including plan build protection");
        set({ 
          steps: [], 
          completedByDate: {}, 
          hasSeenScheduleIntro: false, 
          hasBeenCustomized: false, 
          hasBuiltFromPlan: false, // Reset this flag for dev testing
          lastSavedFromScheduling: null
        });
      },
      
      // Storage maintenance function
      clearStorage: async () => {
        try {
          await AsyncStorage.removeItem("routine:v2");
          console.log("Routine storage cleared successfully");
        } catch (error) {
          console.error("Failed to clear routine storage:", error);
        }
      },
    }),
    { 
      name: "routine:v2",
      storage: createJSONStorage(() => createSafeStorage()),
      // Add partialize to only persist essential data and reduce size
      partialize: (state) => ({
        steps: state.steps,
        completedByDate: state.completedByDate,
        hasSeenScheduleIntro: state.hasSeenScheduleIntro,
        lastSavedFromScheduling: state.lastSavedFromScheduling,
        hasBeenCustomized: state.hasBeenCustomized,
        hasBuiltFromPlan: state.hasBuiltFromPlan,
      }),
      // Add version for migration handling
      version: 2,
    }
  )
);

// Export the buildFromPlan function for use in onboarding
export function buildFromPlan(plan: any) {
  const store = useRoutineStore.getState();
  store.buildFromPlan(plan);
}
