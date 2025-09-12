import type { FleurPlan } from "@/types/plan";
import { API_BASE } from "@/config/env";

type PlanInput = {
  persona: "menopause" | "postpartum" | "general";
  hairType: string;
  washFreq: string;
  goals: string[];
  constraints?: string;
  __detail?: any; // raw multi-selects + extras for personalization
};

export async function fetchPlan(input: PlanInput): Promise<FleurPlan> {
  const r = await fetch(`${API_BASE}/api/plan/build`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error(`Plan build failed: ${r.status}`);
  return r.json();
}
