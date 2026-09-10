import type { FleurPlan } from "@/types/plan";
import { authedFetch, readApiError } from "./apiClient";

type PlanInput = {
  persona: "menopause" | "postpartum" | "general";
  hairType: string;
  washFreq: string;
  goals: string[];
  constraints?: string;
  __detail?: any; // raw multi-selects + extras for personalization
};

/**
 * Build the personalized plan.
 *
 * `/api/plan/build` calls a paid LLM, so it requires an authenticated caller.
 * This request previously carried no Authorization header and every plan build
 * came back 401 — which OnboardingScreen swallowed, substituting the generic
 * fallback plan so the failure was invisible.
 */
export async function fetchPlan(input: PlanInput): Promise<FleurPlan> {
  const res = await authedFetch("/api/plan/build", {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error(await readApiError(res, `Plan build failed (${res.status})`));
  }

  return res.json();
}
