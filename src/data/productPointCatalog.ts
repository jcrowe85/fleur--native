// src/data/productPointCatalog.ts
// Product to point mapping for redemption system

export interface ProductPointMapping {
  sku: string;
  name: string;
  pointsRequired: number;
  category: string;
  description?: string;
}

// Product to point mapping table - using actual Shopify SKUs
export const PRODUCT_POINT_MAPPING: Record<string, ProductPointMapping> = {
  // Hair Care Products - using new Shopify handles
  "bloom": {
    sku: "bloom",
    name: "Hair Growth Serum",
    pointsRequired: 850,
    category: "treat",
    description: "Daily follicle support with lightweight peptide blend"
  },
  "shampoo": {
    sku: "shampoo", 
    name: "Shampoo",
    pointsRequired: 750,
    category: "cleanse",
    description: "Low-stripping wash that cleanses without over-drying"
  },
  "conditioner": {
    sku: "conditioner",
    name: "Conditioner", 
    pointsRequired: 780,
    category: "condition",
    description: "Daily slip & softness that detangles and softens"
  },
  "hair-mask": {
    sku: "hair-mask",
    name: "Hair Mask",
    pointsRequired: 900,
    category: "treat",
    description: "Weekly deep treatment that rebuilds broken bonds"
  },
  "heat-shield": {
    sku: "heat-shield",
    name: "Heat Shield",
    pointsRequired: 1200,
    category: "protect", 
    description: "Essential protection for heat styling"
  },
  "detangling-comb": {
    sku: "detangling-comb",
    name: "Detangling Comb",
    pointsRequired: 250,
    category: "style",
    description: "Gentle detangling comb for all hair types"
  },
  "micro-roller": {
    sku: "micro-roller",
    name: "Derma Stamp",
    pointsRequired: 725,
    category: "treat",
    description: "Micro-needling tool for enhanced product absorption"
  },
  "silk-pillow": {
    sku: "silk-pillow",
    name: "Silk Pillow",
    pointsRequired: 650,
    category: "protect",
    description: "Reduces overnight friction and breakage"
  },
  
  // Supplements - using new Shopify handles
  "vegan-biotin": {
    sku: "vegan-biotin",
    name: "Vegan Biotin",
    pointsRequired: 500,
    category: "supplement",
    description: "Supports healthy hair growth and strength"
  },
  "vitamin-d3": {
    sku: "vitamin-d3", 
    name: "Vitamin D3",
    pointsRequired: 500,
    category: "supplement",
    description: "Essential vitamin for overall hair health"
  },
  "iron": {
    sku: "iron",
    name: "Iron", 
    pointsRequired: 500,
    category: "supplement",
    description: "Supports healthy hair growth and prevents thinning"
  },

  // Legacy mappings (keep for backward compatibility)
  "fleur-1": {
    sku: "fleur-1",
    name: "Hair Growth Serum",
    pointsRequired: 850,
    category: "treat",
    description: "Daily follicle support with lightweight peptide blend"
  },
  "fleur-shampoo": {
    sku: "fleur-shampoo", 
    name: "Shampoo",
    pointsRequired: 750,
    category: "cleanse",
    description: "Low-stripping wash that cleanses without over-drying"
  },
  "fleur-conditioner": {
    sku: "fleur-conditioner",
    name: "Conditioner", 
    pointsRequired: 780,
    category: "condition",
    description: "Daily slip & softness that detangles and softens"
  },
  "fleur-hair-mask": {
    sku: "fleur-hair-mask",
    name: "Hair Mask",
    pointsRequired: 900,
    category: "treat",
    description: "Weekly deep treatment that rebuilds broken bonds"
  },
  "fleur-heat-shield": {
    sku: "fleur-heat-shield",
    name: "Heat Shield",
    pointsRequired: 1200,
    category: "protect", 
    description: "Essential protection for heat styling"
  },
  "fleur-detangling-comb": {
    sku: "fleur-detangling-comb",
    name: "Detangling Comb",
    pointsRequired: 250,
    category: "style",
    description: "Gentle detangling comb for all hair types"
  },
  "Fleur-derma-stamp": {
    sku: "Fleur-derma-stamp",
    name: "Derma Stamp",
    pointsRequired: 725,
    category: "treat",
    description: "Micro-needling tool for enhanced product absorption"
  },
  "fleur-biotin": {
    sku: "fleur-biotin",
    name: "Vegan Biotin",
    pointsRequired: 500,
    category: "supplement",
    description: "Supports healthy hair growth and strength"
  },
  "fleur-vitamin-d3": {
    sku: "fleur-vitamin-d3", 
    name: "Vitamin D3",
    pointsRequired: 500,
    category: "supplement",
    description: "Essential vitamin for overall hair health"
  },
  "fleur-iron": {
    sku: "fleur-iron",
    name: "Iron", 
    pointsRequired: 500,
    category: "supplement",
    description: "Supports healthy hair growth and prevents thinning"
  }
};

// Helper functions
export function getProductPointValue(sku: string): number {
  const direct = PRODUCT_POINT_MAPPING[sku]?.pointsRequired;
  if (direct) return direct;
  const aliased = SKU_ALIASES[sku];
  return aliased ? PRODUCT_POINT_MAPPING[aliased]?.pointsRequired ?? 0 : 0;
}

/**
 * Legacy SKU aliases.
 *
 * These used to point at keys that do not exist in PRODUCT_POINT_MAPPING
 * ("fleur-derma-stamp" vs the actual "Fleur-derma-stamp", and
 * "fleur-silk-pillowcase" which was never in the table at all), which made the
 * derma stamp and silk pillow permanently un-redeemable — getProductPointValue
 * returned 0 and the UI reported "not available for point redemption".
 *
 * Aliases now resolve to canonical handles that are guaranteed to exist.
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

/** Resolve any handle or legacy SKU to the canonical catalog key. */
export function canonicalSku(sku: string): string {
  if (!sku) return "";
  if (sku in PRODUCT_POINT_MAPPING) return sku;
  return SKU_ALIASES[sku] ?? sku;
}

/** Back-compat name kept for existing call sites. */
export function mapShopifyHandleToPointSku(shopifyHandle: string): string {
  return canonicalSku(shopifyHandle);
}

/**
 * Best-effort resolution of a Shopify product to a redeemable SKU.
 *
 * Tries the handle first, then a slug of the title, then a keyword match. The
 * two redemption screens each carried their own copy of this ladder with point
 * values that had drifted apart (heat shield was 700 in one and 1200 in the
 * other); it lives here now so there is a single answer.
 *
 * The returned point value is for display only — the server re-resolves the
 * price from its own catalog when the redemption is actually issued.
 */
const TITLE_KEYWORDS: Array<[RegExp, string]> = [
  [/serum|bloom/, "bloom"],
  [/shampoo/, "shampoo"],
  [/conditioner/, "conditioner"],
  [/mask|repair/, "hair-mask"],
  [/heat|shield|thermal/, "heat-shield"],
  [/comb|detangl/, "detangling-comb"],
  [/pillow|silk/, "silk-pillow"],
  [/derma|stamp|roller/, "micro-roller"],
  [/biotin/, "vegan-biotin"],
  [/vitamin ?d/, "vitamin-d3"],
  [/iron/, "iron"],
];

export function resolveRedeemableSku(product: {
  handle?: string | null;
  title?: string | null;
}): { sku: string; pointsRequired: number } | null {
  const candidates: string[] = [];

  if (product.handle) candidates.push(product.handle);
  if (product.title) {
    candidates.push(product.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  }

  for (const candidate of candidates) {
    const sku = canonicalSku(candidate);
    const points = getProductPointValue(sku);
    if (points > 0) return { sku, pointsRequired: points };
  }

  const title = (product.title ?? "").toLowerCase();
  for (const [pattern, sku] of TITLE_KEYWORDS) {
    if (pattern.test(title)) {
      const points = getProductPointValue(sku);
      if (points > 0) return { sku, pointsRequired: points };
    }
  }

  return null;
}

export function getProductInfo(sku: string): ProductPointMapping | null {
  return PRODUCT_POINT_MAPPING[canonicalSku(sku)] ?? null;
}

export function getAllProducts(): ProductPointMapping[] {
  return Object.values(PRODUCT_POINT_MAPPING);
}

export function getProductsByCategory(category: string): ProductPointMapping[] {
  return Object.values(PRODUCT_POINT_MAPPING).filter(product => product.category === category);
}

// Calculate if user can afford a product
export function canAffordProduct(sku: string, userPoints: number): boolean {
  const pointsRequired = getProductPointValue(sku);
  return pointsRequired > 0 && userPoints >= pointsRequired;
}

// Calculate remaining points after purchase
export function calculateRemainingPoints(sku: string, userPoints: number): number {
  const pointsRequired = getProductPointValue(sku);
  return Math.max(0, userPoints - pointsRequired);
}
