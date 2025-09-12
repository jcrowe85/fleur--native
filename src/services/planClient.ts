// src/services/planClient.ts
import type { FleurPlan, PlanInput } from "@/types/plans";
import { API_BASE } from "@/config/env";

export async function fetchPlan(input: PlanInput): Promise<FleurPlan> {
  const r = await fetch(`${API_BASE}/api/plan/build`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input), // may include __detail (prompt-only)
  });
  if (!r.ok) throw new Error(`Plan build failed: ${r.status}`);
  return r.json();
}
