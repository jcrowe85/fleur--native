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
  return PRODUCT_POINT_MAPPING[sku]?.pointsRequired || 0;
}

// Map Shopify handles to point catalog SKUs for point redemption
export function mapShopifyHandleToPointSku(shopifyHandle: string): string {
  const handleToSkuMapping: Record<string, string> = {
    "bloom": "fleur-1",
    "micro-roller": "fleur-derma-stamp",
    "shampoo": "fleur-shampoo",
    "conditioner": "fleur-conditioner", 
    "hair-mask": "fleur-hair-mask",
    "heat-shield": "fleur-heat-shield",
    "detangling-comb": "fleur-detangling-comb",
    "vegan-biotin": "fleur-biotin",
    "vitamin-d3": "fleur-vitamin-d3",
    "iron": "fleur-iron",
    "silk-pillow": "fleur-silk-pillowcase",
  };
  
  return handleToSkuMapping[shopifyHandle] || shopifyHandle;
}

export function getProductInfo(sku: string): ProductPointMapping | null {
  return PRODUCT_POINT_MAPPING[sku] || null;
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
  return userPoints >= pointsRequired;
}

// Calculate remaining points after purchase
export function calculateRemainingPoints(sku: string, userPoints: number): number {
  const pointsRequired = getProductPointValue(sku);
  return Math.max(0, userPoints - pointsRequired);
}
