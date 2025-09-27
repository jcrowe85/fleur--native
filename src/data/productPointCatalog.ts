// src/data/productPointCatalog.ts
// Product to point mapping for redemption system

export interface ProductPointMapping {
  sku: string;
  name: string;
  pointsRequired: number;
  category: string;
  description?: string;
}

// Product to point mapping table
export const PRODUCT_POINT_MAPPING: Record<string, ProductPointMapping> = {
  // Hair Care Products
  "bloom": {
    sku: "bloom",
    name: "Bloom Hair+Scalp Serum",
    pointsRequired: 850,
    category: "treat",
    description: "Daily follicle support with lightweight peptide blend"
  },
  "fleur-shampoo": {
    sku: "fleur-shampoo", 
    name: "Gentle Shampoo",
    pointsRequired: 750,
    category: "cleanse",
    description: "Low-stripping wash that cleanses without over-drying"
  },
  "fleur-conditioner": {
    sku: "fleur-conditioner",
    name: "Lightweight Conditioner", 
    pointsRequired: 780,
    category: "condition",
    description: "Daily slip & softness that detangles and softens"
  },
  "fleur-repair-mask": {
    sku: "fleur-repair-mask",
    name: "Bond Repair Mask",
    pointsRequired: 900,
    category: "treat",
    description: "Weekly deep treatment that rebuilds broken bonds"
  },
  "fleur-heat-shield": {
    sku: "fleur-heat-shield",
    name: "Heat Shield Spray",
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
  "fleur-silk-pillowcase": {
    sku: "fleur-silk-pillowcase",
    name: "Silk Pillowcase",
    pointsRequired: 650,
    category: "protect",
    description: "Reduces friction and prevents breakage while sleeping"
  },
  "fleur-derma-stamp": {
    sku: "fleur-derma-stamp",
    name: "Derma Stamp",
    pointsRequired: 725,
    category: "treat",
    description: "Micro-needling tool for enhanced product absorption"
  },
  "fleur-complete-kit": {
    sku: "fleur-complete-kit",
    name: "Complete Hair Kit",
    pointsRequired: 3500,
    category: "kit",
    description: "Complete hair care routine in one kit"
  },
  
  // Supplements
  "fleur-biotin": {
    sku: "fleur-biotin",
    name: "Biotin Supplement",
    pointsRequired: 500,
    category: "supplement",
    description: "Supports healthy hair growth and strength"
  },
  "fleur-vitamin-d3": {
    sku: "fleur-vitamin-d3", 
    name: "Vitamin D3 Supplement",
    pointsRequired: 500,
    category: "supplement",
    description: "Essential vitamin for overall hair health"
  },
  "fleur-iron": {
    sku: "fleur-iron",
    name: "Iron Supplement", 
    pointsRequired: 500,
    category: "supplement",
    description: "Supports healthy hair growth and prevents thinning"
  }
};

// Helper functions
export function getProductPointValue(sku: string): number {
  return PRODUCT_POINT_MAPPING[sku]?.pointsRequired || 0;
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
