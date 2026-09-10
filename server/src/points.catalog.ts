// server/src/points.catalog.ts
//
// SERVER-SIDE SOURCE OF TRUTH for point pricing.
//
// The client keeps its own copy in src/data/productPointCatalog.ts for display,
// but the server must never trust a price, point value, discount amount, or
// discount code that arrived in a request body. Everything monetary resolves here.

/** Canonical SKU -> points required. Keys are Shopify product handles. */
const POINTS_BY_SKU: Record<string, number> = {
  bloom: 850,
  shampoo: 750,
  conditioner: 780,
  "hair-mask": 900,
  "heat-shield": 1200,
  "detangling-comb": 250,
  "micro-roller": 725,
  "silk-pillow": 650,
  "vegan-biotin": 500,
  "vitamin-d3": 500,
  iron: 500,
};

/**
 * Legacy SKUs that older app builds still send. They resolve to the canonical
 * handle so an out-of-date client keeps working instead of silently receiving a
 * "not in point catalog" error. (The previous mapping had two dead ends:
 * "silk-pillow" and "micro-roller" mapped to keys that did not exist, which made
 * both products permanently un-redeemable.)
 */
const SKU_ALIASES: Record<string, string> = {
  "fleur-1": "bloom",
  "bloom-hair-scalp-serum-longform": "bloom",
  "fleur-serum": "bloom",
  "fleur-shampoo": "shampoo",
  "fleur-conditioner": "conditioner",
  "fleur-hair-mask": "hair-mask",
  "fleur-repair-mask": "hair-mask",
  "fleur-heat-shield": "heat-shield",
  "fleur-detangling-comb": "detangling-comb",
  "fleur-derma-stamp": "micro-roller",
  "Fleur-derma-stamp": "micro-roller",
  "fleur-silk-pillowcase": "silk-pillow",
  "fleur-biotin": "vegan-biotin",
  "fleur-vitamin-d3": "vitamin-d3",
  "fleur-iron": "iron",
};

export function canonicalSku(sku: string): string {
  if (!sku) return "";
  if (sku in POINTS_BY_SKU) return sku;
  return SKU_ALIASES[sku] ?? sku;
}

/** Points required for a SKU, or 0 when the SKU is not redeemable. */
export function getProductPointValue(sku: string): number {
  return POINTS_BY_SKU[canonicalSku(sku)] ?? 0;
}

export function isRedeemable(sku: string): boolean {
  return getProductPointValue(sku) > 0;
}

/** Every redeemable SKU, for the client to sync against. */
export function redeemableSkus(): Array<{ sku: string; points: number }> {
  return Object.entries(POINTS_BY_SKU).map(([sku, points]) => ({ sku, points }));
}
