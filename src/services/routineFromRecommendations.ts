// src/services/routineFromRecommendations.ts
import { useRecommendationsStore, Recommendation } from "@/state/recommendationsStore";
import { useRoutineStore, RoutineStep, Period } from "@/state/routineStore";

/** quick id helper */
function uid() {
  return Math.random().toString(36).slice(2, 8) + "-" + Date.now().toString(36);
}

/** crude icon guesser (feel free to refine) */
function guessIcon(title = "", product = ""): string {
  const t = `${title} ${product}`.toLowerCase();
  if (t.includes("serum") || t.includes("oil")) return "droplet";
  if (t.includes("massage") || t.includes("stimulation")) return "zap";
  if (t.includes("derma") || t.includes("roller") || t.includes("stamp")) return "activity";
  if (t.includes("night") || t.includes("sleep")) return "moon";
  if (t.includes("shampoo") || t.includes("wash")) return "cloud-rain";
  return "star"; // default
}

/** map “night” → evening; otherwise pass through */
function normalizePeriod(timeOfDay?: Recommendation["timeOfDay"]): Period | undefined {
  if (!timeOfDay) return undefined;
  if (timeOfDay === "night") return "evening";
  if (timeOfDay === "weekly") return "weekly";
  if (timeOfDay === "morning" || timeOfDay === "evening") return timeOfDay;
  return undefined;
}

/** Build RoutineSteps from a recommendations payload */
export function mapRecommendationsToRoutineSteps(recs: Recommendation[]): RoutineStep[] {
  return recs.map((r) => {
    const period = normalizePeriod(r.timeOfDay);
    const isWeekly =
      (r.frequency || "").toLowerCase().includes("weekly") || period === "weekly";

    const step: RoutineStep = {
      id: r.id || uid(),
      name: r.title || r.product || "Routine Step",
      time: r.time ?? (period === "morning" ? "8:00 AM" : period === "evening" ? "8:00 PM" : undefined),
      frequency: r.frequency ?? (isWeekly ? "Weekly" : "Daily"),
      period: period ?? (isWeekly ? "weekly" : "morning"),
      enabled: r.enabled !== false, // default true
      instructions:
        r.instructions ??
        (r.product
          ? `Use ${r.product} as directed.`
          : "Follow the instructions shown for best results."),
      product: r.product,
      icon: guessIcon(r.title, r.product),
    };

    return step;
  });
}

/**
 * Read recommendations from the recs store and seed the routine store IF the
 * routine is empty. Keeps defaults as last fallback via routineStore.applyDefaultIfEmpty().
 */
export function syncRoutineFromRecommendationsIfEmpty() {
  const { items } = useRecommendationsStore.getState();
  const { steps, setSteps, applyDefaultIfEmpty } = useRoutineStore.getState();

  if (steps.length > 0) return; // already seeded/customized

  if (items.length > 0) {
    const stepsFromRecs = mapRecommendationsToRoutineSteps(items).filter((s) => s.enabled);
    if (stepsFromRecs.length > 0) {
      setSteps(stepsFromRecs);
      return;
    }
  }

  // fallback: keep former safety net
  applyDefaultIfEmpty();
}
