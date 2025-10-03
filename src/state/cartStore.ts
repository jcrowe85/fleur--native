// src/state/cartStore.ts
import { create } from "zustand";

export type CartItem = {
  sku: string;
  name: string;
  qty: number;
  priceCents: number;
  imageUrl?: string;
  variantId?: string; // Shopify variant GID or numeric ID string
};

type CartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  addBySku: (sku: string, qty?: number) => void;
  remove: (sku: string) => void;
  increment: (sku: string) => void;
  decrement: (sku: string) => void;
  setQty: (sku: string, qty: number) => void;
  clear: () => void;
  addSkusQuick: (skus: string[]) => void;

  /** Helpers for Shopify Cart/Checkout APIs */
  buildVariantLines: () => { variantId: string; quantity: number }[];
  buildCartLines: () => { merchandiseId: string; quantity: number }[];
};

/** ────────────────────────────────────────────────────────────────
 * Central SKU metadata (fill these out)
 * ─────────────────────────────────────────────────────────────── */
const SKU_TO_VARIANT: Record<string, string> = {
  // ✅ Real Shopify variant IDs from API - using Shopify handles as primary keys
  "bloom": "gid://shopify/ProductVariant/44138306273459",
  "micro-roller": "gid://shopify/ProductVariant/44138710597811",
  "detangling-comb": "gid://shopify/ProductVariant/45032094597299",
  "vegan-biotin": "gid://shopify/ProductVariant/45032903278771",
  "vitamin-d3": "gid://shopify/ProductVariant/45032910520499",
  "iron": "gid://shopify/ProductVariant/45032935882931",
  "shampoo": "gid://shopify/ProductVariant/45032954888371",
  "conditioner": "gid://shopify/ProductVariant/45033047720115",
  "hair-mask": "gid://shopify/ProductVariant/45033167716531",
  "heat-shield": "gid://shopify/ProductVariant/45033200713907",
  "silk-pillow": "gid://shopify/ProductVariant/45033276080307",

  // Legacy mappings (keep for backward compatibility)
  "fleur-serum": "gid://shopify/ProductVariant/44138306273459", // Same as bloom
  "fleur-derma-stamp": "gid://shopify/ProductVariant/44138710597811", // Same as micro-roller
  "fleur-shampoo": "gid://shopify/ProductVariant/45032954888371", // Same as shampoo
  "fleur-conditioner": "gid://shopify/ProductVariant/45033047720115", // Same as conditioner
  "fleur-repair-mask": "gid://shopify/ProductVariant/45033167716531", // Same as hair-mask
  "fleur-heat-shield": "gid://shopify/ProductVariant/45033200713907", // Same as heat-shield
  "fleur-silk-pillowcase": "gid://shopify/ProductVariant/45033276080307", // Same as silk-pillow
  "fleur-biotin": "gid://shopify/ProductVariant/45032903278771", // Same as vegan-biotin
  "fleur-iron": "gid://shopify/ProductVariant/45032935882931", // Same as iron
  "fleur-vitamin-d3": "gid://shopify/ProductVariant/45032910520499", // Same as vitamin-d3

  // Other legacy mappings
  "fleur-cleanser-generic": "",
  "fleur-conditioner-generic": "",
  "fleur-bond-mask": "",
  "fleur-heat-protectant": "",
  "fleur-detangling-comb": "",
  "fleur-complete-kit": "",
};

const SKU_PRICE_CENTS: Record<string, number> = {
  // Real prices from Shopify API - using Shopify handles as primary keys
  "bloom": 4800,
  "micro-roller": 3000,
  "detangling-comb": 4200,
  "vegan-biotin": 1500,
  "vitamin-d3": 1500,
  "iron": 1500,
  "shampoo": 2600,
  "conditioner": 2600,
  "hair-mask": 2500,
  "heat-shield": 4500,
  "silk-pillow": 3500,

  // Legacy mappings (keep for backward compatibility)
  "fleur-serum": 4800, // Same as bloom
  "fleur-derma-stamp": 3000, // Same as micro-roller
  "fleur-shampoo": 2600, // Same as shampoo
  "fleur-conditioner": 2600, // Same as conditioner
  "fleur-repair-mask": 2500, // Same as hair-mask
  "fleur-heat-shield": 4500, // Same as heat-shield
  "fleur-silk-pillowcase": 3500, // Same as silk-pillow
  "fleur-biotin": 1500, // Same as vegan-biotin
  "fleur-iron": 1500, // Same as iron
  "fleur-vitamin-d3": 1500, // Same as vitamin-d3

  // Other legacy mappings
  "fleur-cleanser-generic": 1800,
  "fleur-conditioner-generic": 1800,
  "fleur-bond-mask": 2800,
  "fleur-heat-protectant": 2200,
  "fleur-detangling-comb": 1500,
  "fleur-complete-kit": 12000,
};

const SKU_NAME: Record<string, string> = {
  // Real product names from Shopify API - using Shopify handles as primary keys
  "bloom": "hair growth serum",
  "micro-roller": "Derma Stamp",
  "detangling-comb": "Detangling Comb",
  "vegan-biotin": "vegan biotin",
  "vitamin-d3": "vitamin d3",
  "iron": "iron",
  "shampoo": "shampoo",
  "conditioner": "conditioner",
  "hair-mask": "hair mask",
  "heat-shield": "heat shield",
  "silk-pillow": "silk pillow",

  // Legacy mappings (keep for backward compatibility)
  "fleur-serum": "hair growth serum", // Same as bloom
  "fleur-derma-stamp": "Derma Stamp", // Same as micro-roller
  "fleur-shampoo": "shampoo", // Same as shampoo
  "fleur-conditioner": "conditioner", // Same as conditioner
  "fleur-repair-mask": "hair mask", // Same as hair-mask
  "fleur-heat-shield": "heat shield", // Same as heat-shield
  "fleur-silk-pillowcase": "silk pillow", // Same as silk-pillow
  "fleur-biotin": "vegan biotin", // Same as vegan-biotin
  "fleur-iron": "iron", // Same as iron
  "fleur-vitamin-d3": "vitamin d3", // Same as vitamin-d3

  // Other legacy mappings
  "fleur-cleanser-generic": "Gentle Cleanser",
  "fleur-conditioner-generic": "Lightweight Conditioner",
  "fleur-bond-mask": "Bond Repair Mask",
  "fleur-heat-protectant": "Heat Protectant",
  "fleur-detangling-comb": "Detangling Comb",
  "fleur-complete-kit": "Complete Hair Kit",
};

// Real image URLs from Shopify API - using Shopify handles as primary keys
const SKU_IMAGE: Record<string, string | undefined> = {
  // Real Shopify product images
  "bloom": "https://cdn.shopify.com/s/files/1/0683/1256/3891/files/new_single_23e90b78-701c-4676-bf9c-6ce115c58ccd.png?v=1738964215",
  "micro-roller": "https://cdn.shopify.com/s/files/1/0683/1256/3891/files/Derma_Stamp_Final_hero.png?v=1734400492",
  "detangling-comb": "https://cdn.shopify.com/s/files/1/0683/1256/3891/files/fleur_comb_f1e00f2c-b8e5-4c64-912a-c6ef73339efd.png?v=1758929620",
  "vegan-biotin": "https://cdn.shopify.com/s/files/1/0683/1256/3891/files/amazon_biotin_2000x2000_dc31b961-07be-4704-b038-e19a2e891d6d.png?v=1758922325",
  "vitamin-d3": "https://cdn.shopify.com/s/files/1/0683/1256/3891/files/amazonvitamind32000x2000.png?v=1758923106",
  "iron": "https://cdn.shopify.com/s/files/1/0683/1256/3891/files/amazoniron2000x2000_ff2a7d3b-878c-40b4-be7b-5348da607099.png?v=1758925293",
  "shampoo": "https://cdn.shopify.com/s/files/1/0683/1256/3891/files/amazonshampoo.png?v=1758926941",
  "conditioner": "https://cdn.shopify.com/s/files/1/0683/1256/3891/files/amazonconditioner2000x2000.png?v=1758929053",
  "hair-mask": "https://cdn.shopify.com/s/files/1/0683/1256/3891/files/evanychairmask.png?v=1758935840",
  "heat-shield": "https://cdn.shopify.com/s/files/1/0683/1256/3891/files/living_proof_thermal_spray_2000x2000_d3a81453-e141-4223-9f10-9a5c30f52b1b.png?v=1758939057",
  "silk-pillow": "https://cdn.shopify.com/s/files/1/0683/1256/3891/files/bedelitesatinpillowcase.png?v=1758939977",

  // Legacy mappings (keep for backward compatibility)
  "fleur-serum": "https://cdn.shopify.com/s/files/1/0683/1256/3891/files/new_single_23e90b78-701c-4676-bf9c-6ce115c58ccd.png?v=1738964215", // Same as bloom
  "fleur-derma-stamp": "https://cdn.shopify.com/s/files/1/0683/1256/3891/files/Derma_Stamp_Final_hero.png?v=1734400492", // Same as micro-roller
  "fleur-shampoo": "https://cdn.shopify.com/s/files/1/0683/1256/3891/files/amazonshampoo.png?v=1758926941", // Same as shampoo
  "fleur-conditioner": "https://cdn.shopify.com/s/files/1/0683/1256/3891/files/amazonconditioner2000x2000.png?v=1758929053", // Same as conditioner
  "fleur-repair-mask": "https://cdn.shopify.com/s/files/1/0683/1256/3891/files/evanychairmask.png?v=1758935840", // Same as hair-mask
  "fleur-heat-shield": "https://cdn.shopify.com/s/files/1/0683/1256/3891/files/living_proof_thermal_spray_2000x2000_d3a81453-e141-4223-9f10-9a5c30f52b1b.png?v=1758939057", // Same as heat-shield
  "fleur-silk-pillowcase": "https://cdn.shopify.com/s/files/1/0683/1256/3891/files/bedelitesatinpillowcase.png?v=1758939977", // Same as silk-pillow
  "fleur-biotin": "https://cdn.shopify.com/s/files/1/0683/1256/3891/files/amazon_biotin_2000x2000_dc31b961-07be-4704-b038-e19a2e891d6d.png?v=1758922325", // Same as vegan-biotin
  "fleur-iron": "https://cdn.shopify.com/s/files/1/0683/1256/3891/files/amazoniron2000x2000_ff2a7d3b-878c-40b4-be7b-5348da607099.png?v=1758925293", // Same as iron
  "fleur-vitamin-d3": "https://cdn.shopify.com/s/files/1/0683/1256/3891/files/amazonvitamind32000x2000.png?v=1758923106", // Same as vitamin-d3

  // Other legacy mappings
  "fleur-cleanser-generic": undefined,
  "fleur-conditioner-generic": undefined,
  "fleur-bond-mask": undefined,
  "fleur-heat-protectant": undefined,
  "fleur-detangling-comb": undefined,
  "fleur-complete-kit": undefined,
};

/** Treat 0/undefined/NaN as invalid price and fall back to map */
function normalizePriceCents(incoming?: number, mapped?: number): number {
  const inc = Number(incoming);
  const hasValidIncoming = Number.isFinite(inc) && inc > 0;
  if (hasValidIncoming) return Math.round(inc);

  const map = Number(mapped);
  const hasValidMapped = Number.isFinite(map) && map > 0;
  return hasValidMapped ? Math.round(map) : 0;
}

/** Hydrate any missing fields from the SKU maps so single adds get priced */
function ensureSkuDefaults(base: Omit<CartItem, "qty">): Omit<CartItem, "qty"> {
  const sku = base.sku;

  const name = base.name ?? SKU_NAME[sku] ?? sku;
  const variantId = base.variantId || SKU_TO_VARIANT[sku]; // empty string -> fallback
  const imageUrl = base.imageUrl ?? SKU_IMAGE[sku];

  // 🔧 FIX: if incoming priceCents is 0/undefined/NaN, use map price
  const mappedPrice = SKU_PRICE_CENTS[sku];
  const priceCents = normalizePriceCents(base.priceCents, mappedPrice);

  // Helpful warnings
  if (!(sku in SKU_NAME) && !(sku in SKU_PRICE_CENTS) && !(sku in SKU_TO_VARIANT)) {
    console.warn(`[cart] Unknown SKU "${sku}". Add it to your SKU maps to avoid $0.00 or checkout errors.`);
  }
  if (!priceCents) {
    console.warn(`[cart] Missing price for SKU "${sku}". Add it to SKU_PRICE_CENTS to avoid $0.00 in cart.`);
  }
  if (!variantId) {
    console.warn(`[cart] Missing variantId for SKU "${sku}". Add it to SKU_TO_VARIANT so checkout works.`);
  }

  return { ...base, name, variantId, priceCents, imageUrl };
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  /** Generic add (kept for compatibility) – now always hydrates from maps */
  add: (base, qty = 1) => {
    const hydrated = ensureSkuDefaults(base);
    set((state) => {
      const found = state.items.find((i) => i.sku === hydrated.sku);
      if (found) {
        return {
          items: state.items.map((i) =>
            i.sku === hydrated.sku ? { ...i, qty: Math.min(99, i.qty + qty) } : i
          ),
        };
      }
      return { items: [...state.items, { ...hydrated, qty }] };
    });
  },

  /** Preferred for UI: ensures pricing/ids even if you only pass the SKU */
  addBySku: (sku, qty = 1) => {
    const { add } = get();
    add(
      {
        sku,
        name: SKU_NAME[sku],
        priceCents: SKU_PRICE_CENTS[sku],
        variantId: SKU_TO_VARIANT[sku],
        imageUrl: SKU_IMAGE[sku],
      },
      qty
    );
  },

  remove: (sku) => set((s) => ({ items: s.items.filter((i) => i.sku !== sku) })),

  increment: (sku) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.sku === sku ? { ...i, qty: Math.min(99, i.qty + 1) } : i
      ),
    })),

  decrement: (sku) =>
    set((s) => ({
      items: s.items
        .map((i) => (i.sku === sku ? { ...i, qty: Math.max(0, i.qty - 1) } : i))
        .filter((i) => i.qty > 0),
    })),

  setQty: (sku, qty) =>
    set((s) => ({
      items: s.items
        .map((i) =>
          i.sku === sku ? { ...i, qty: Math.max(0, Math.min(99, Math.floor(qty))) } : i
        )
        .filter((i) => i.qty > 0),
    })),

  clear: () => set({ items: [] }),

  /** Fast add for bundles/kits – now uses addBySku to guarantee prices */
  addSkusQuick: (skus) => {
    const { addBySku } = get();
    skus.forEach((sku) => addBySku(sku, 1));
  },

  // ----------------------------
  // ✅ Helpers for Shopify API
  // ----------------------------
  buildVariantLines: () =>
    get()
      .items
      .filter((i) => !!i.variantId)
      .map((i) => ({ variantId: String(i.variantId), quantity: i.qty })),

  buildCartLines: () =>
    get()
      .items
      .filter((i) => !!i.variantId)
      .map((i) => ({
        merchandiseId: toGid(String(i.variantId)),
        quantity: i.qty,
      })),
}));

function toGid(variantId: string): string {
  if (variantId.startsWith("gid://")) return variantId;
  if (/^\d+$/.test(variantId)) return `gid://shopify/ProductVariant/${variantId}`;
  return variantId;
}
