// src/lib/products.ts
import type { FleurPlan } from "@/types/plans";
import type { FeatherName } from "@/lib/icons";

export type ProductCategory =
  | "cleanse" | "condition" | "treat" | "protect"
  | "scalp" | "style" | "oil" | "other";

/** Default “classic” order for a tight kit */
export const KIT_SLOT_ORDER: ProductCategory[] = ["cleanse","condition","treat","protect"];

export function labelForSlot(slot: ProductCategory): string {
  switch (slot) {
    case "cleanse": return "Cleanse";
    case "condition": return "Condition";
    case "treat": return "Treat";
    case "protect": return "Protect";
    case "scalp": return "Scalp";
    case "style": return "Style";
    case "oil": return "Oil";
    default: return "Other";
  }
}

export function iconForSlot(slot: ProductCategory): FeatherName {
  switch (slot) {
    case "cleanse": return "droplet";
    case "condition": return "layers";
    case "treat": return "star";
    case "protect": return "shield";
    case "scalp": return "activity";
    case "style": return "wind";
    case "oil": return "feather";
    default: return "package";
  }
}

/** Smarter categorization to catch your real catalog items */
export function categorize(rec: FleurPlan["recommendations"][number]): ProductCategory {
  const t = (rec?.title || "").toLowerCase();
  const why = (rec?.why || "").toLowerCase();
  const all = `${t} ${why}`;

  // Specific signals first
  if (/\b(derma\s*stamp|microneed(l)?e|micro[- ]?needle)\b/.test(all)) return "scalp";
  if (/\b(heat|thermal)\s*protect/.test(all)) return "protect";
  if (/\bscalp\b/.test(all)) return "scalp";
  if (/\bserum\b/.test(all)) return /\bscalp\b/.test(all) ? "scalp" : "treat";

  // General
  if (/\b(cleanse|shampoo|wash)\b/.test(all)) return "cleanse";
  if (/\b(condition|leave[- ]?in)\b/.test(all)) return "condition";
  if (/\b(mask|bond|treat|repair)\b/.test(all)) return "treat";
  if (/\bstyle|mousse|spray|cream|gel\b/.test(all)) return "style";
  if (/\boil\b/.test(all)) return "oil";
  return "other";
}

/**
 * Prefer Scalp in the 4-item kit when the plan clearly emphasizes scalp work.
 * We’ll swap Scalp in for Treat (keeping kit size = 4) if:
 *  - there’s at least one Scalp recommendation, AND
 *  - the plan text mentions scalp/follicle/derma/needling
 */
export function preferredKitOrder(plan: FleurPlan | null, recs: FleurPlan["recommendations"]): ProductCategory[] {
  if (!plan) return KIT_SLOT_ORDER;

  const text = [
    plan.summary?.primary?.title,
    plan.summary?.primary?.paragraph,
    plan.summary?.headsUp,
    ...(plan.summary?.quickWins || []),
    plan.routine?.overview?.paragraph,
    ...(plan.routine?.why || []),
    ...(plan.routine?.notes || []),
  ].filter(Boolean).join(" ").toLowerCase();

  const mentionsScalp = /\b(scalp|follicle|derma\s*stamp|microneed(l)?e|micro[- ]?needle)\b/.test(text);
  const hasScalpRec = recs.some((r) => categorize(r) === "scalp");

  if (mentionsScalp && hasScalpRec) {
    // Cleanse → Condition → Scalp → Protect (swap Scalp in for Treat)
    return ["cleanse","condition","scalp","protect"];
  }
  return KIT_SLOT_ORDER;
}

/** Pick up to 4 distinct categories quickly */
export function pickKit(recs: FleurPlan["recommendations"]) {
  const seen = new Set<ProductCategory>();
  const kit: typeof recs = [];
  for (const r of recs) {
    const cat = categorize(r);
    if (!seen.has(cat) && cat !== "other") {
      kit.push(r);
      seen.add(cat);
    }
    if (kit.length >= 4) break;
  }
  return kit;
}
