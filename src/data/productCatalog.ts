// src/data/productCatalog.ts
export type ProductCategory = "cleanse" | "condition" | "treat" | "style" | "supplement";

export interface RedeemableProduct {
  sku: string;
  name: string;
  priceCents: number;
  pointsRequired: number; // Points needed to redeem
  imageUrl: string;
  category: ProductCategory;
  description: string;
  isRedeemable: boolean; // Whether this product can be redeemed with points
  maxRedemptionValue?: number; // Maximum dollar amount that can be offset with points
}

// Core products from the shop
export const CORE_PRODUCTS: Record<string, RedeemableProduct> = {
  cleanse: {
    sku: "fleur-cleanser-generic",
    name: "Gentle Cleanser",
    priceCents: 1800, // $18.00
    pointsRequired: 180, // 1 point = $0.10
    imageUrl: "https://example.com/cleanser.jpg",
    category: "cleanse",
    description: "Low-stripping wash that cleanses without over-drying; balances scalp on wash days.",
    isRedeemable: true,
    maxRedemptionValue: 1800,
  },
  condition: {
    sku: "fleur-conditioner-generic", 
    name: "Lightweight Conditioner",
    priceCents: 1800, // $18.00
    pointsRequired: 180,
    imageUrl: "https://example.com/conditioner.jpg",
    category: "condition",
    description: "Lightweight formula that conditions without weighing down fine hair; adds moisture and manageability.",
    isRedeemable: true,
    maxRedemptionValue: 1800,
  },
  serum: {
    sku: "fleur-serum-generic",
    name: "Growth Serum",
    priceCents: 3200, // $32.00
    pointsRequired: 320,
    imageUrl: "https://example.com/serum.jpg",
    category: "treat",
    description: "Peptide-rich serum that supports healthy hair growth and scalp circulation.",
    isRedeemable: true,
    maxRedemptionValue: 3200,
  },
  scrub: {
    sku: "fleur-scrub-generic",
    name: "Scalp Scrub",
    priceCents: 2400, // $24.00
    pointsRequired: 240,
    imageUrl: "https://example.com/scrub.jpg",
    category: "treat",
    description: "Weekly micro-stimulation that targets scalp; complements serum absorption and growth goals.",
    isRedeemable: true,
    maxRedemptionValue: 2400,
  },
};

// Additional products
export const ADDITIONAL_PRODUCTS: RedeemableProduct[] = [
  {
    sku: "fleur-bond-mask",
    name: "Bond Repair Mask",
    priceCents: 2800, // $28.00
    pointsRequired: 280,
    imageUrl: "https://example.com/mask.jpg",
    category: "treat",
    description: "Weekly deep treatment that rebuilds broken bonds for stronger, more resilient hair.",
    isRedeemable: true,
    maxRedemptionValue: 2800,
  },
  {
    sku: "fleur-heat-protectant",
    name: "Heat Protectant Spray",
    priceCents: 2200, // $22.00
    pointsRequired: 220,
    imageUrl: "https://example.com/heat-protectant.jpg",
    category: "style",
    description: "Lightweight spray that protects hair from heat damage up to 450°F.",
    isRedeemable: true,
    maxRedemptionValue: 2200,
  },
  {
    sku: "fleur-vitamin-d",
    name: "Vitamin D Supplement",
    priceCents: 1500, // $15.00
    pointsRequired: 150,
    imageUrl: "https://example.com/vitamin-d.jpg",
    category: "supplement",
    description: "Essential vitamin D3 supplement to support healthy hair growth and overall wellness.",
    isRedeemable: true,
    maxRedemptionValue: 1500,
  },
  {
    sku: "fleur-biotin",
    name: "Biotin Supplement",
    priceCents: 1200, // $12.00
    pointsRequired: 120,
    imageUrl: "https://example.com/biotin.jpg",
    category: "supplement",
    description: "High-potency biotin supplement to support hair strength and growth.",
    isRedeemable: true,
    maxRedemptionValue: 1200,
  },
  {
    sku: "fleur-silk-pillowcase",
    name: "Silk Pillowcase",
    priceCents: 3500, // $35.00
    pointsRequired: 350,
    imageUrl: "https://example.com/silk-pillowcase.jpg",
    category: "style",
    description: "Premium mulberry silk pillowcase that reduces friction and prevents hair breakage while you sleep.",
    isRedeemable: true,
    maxRedemptionValue: 3500,
  },
  {
    sku: "fleur-complete-kit",
    name: "Complete Hair Care Kit",
    priceCents: 8500, // $85.00
    pointsRequired: 850,
    imageUrl: "https://example.com/complete-kit.jpg",
    category: "treat",
    description: "Complete 4-piece hair care system including cleanser, conditioner, serum, and scalp scrub.",
    isRedeemable: true,
    maxRedemptionValue: 8500,
  },
];

// Get all redeemable products
export const getAllRedeemableProducts = (): RedeemableProduct[] => {
  return [
    ...Object.values(CORE_PRODUCTS),
    ...ADDITIONAL_PRODUCTS,
  ].filter(product => product.isRedeemable);
};

// Get products sorted by points required (ascending)
export const getProductsByPointsRequired = (): RedeemableProduct[] => {
  return getAllRedeemableProducts().sort((a, b) => a.pointsRequired - b.pointsRequired);
};

// Get the next product the user can afford
export const getNextAffordableProduct = (userPoints: number): RedeemableProduct | null => {
  const products = getProductsByPointsRequired();
  return products.find(product => product.pointsRequired > userPoints) || null;
};

// Get products the user can currently afford
export const getAffordableProducts = (userPoints: number): RedeemableProduct[] => {
  return getAllRedeemableProducts().filter(product => userPoints >= product.pointsRequired);
};

// Calculate points needed for next product
export const getPointsNeededForNext = (userPoints: number): number => {
  const nextProduct = getNextAffordableProduct(userPoints);
  return nextProduct ? nextProduct.pointsRequired - userPoints : 0;
};
