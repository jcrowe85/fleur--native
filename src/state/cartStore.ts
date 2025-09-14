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
  // ✅ Paste your actual Shopify variant IDs (GID or numeric) here:
  "fleur-serum": "gid://shopify/ProductVariant/44826097221811",
  "fleur-derma-stamp": "gid://shopify/ProductVariant/44138710597811",
  // "fleur-bond-mask": "gid://shopify/ProductVariant/XXXXXXXXXXX",
  // "fleur-cleanser-generic": "gid://shopify/ProductVariant/YYYYYYYYYYY",
  // "fleur-conditioner-generic": "gid://shopify/ProductVariant/ZZZZZZZZZZZ",
};

const SKU_PRICE_CENTS: Record<string, number> = {
  "fleur-serum": 4800,
  "fleur-derma-stamp": 3000,
  "fleur-cleanser-generic": 1800,
  "fleur-conditioner-generic": 1800,
  // "fleur-bond-mask": 2800,
};

const SKU_NAME: Record<string, string> = {
  "fleur-serum": "Fleur Peptide Hair Serum",
  "fleur-derma-stamp": "Derma Stamp (Scalp Tool)",
  "fleur-cleanser-generic": "Gentle Cleanser",
  "fleur-conditioner-generic": "Lightweight Conditioner",
  // "fleur-bond-mask": "Bond Repair Mask",
};

// Optional image mapping (leave undefined if you rely on server images)
const SKU_IMAGE: Record<string, string | undefined> = {
  "fleur-serum": undefined,
  "fleur-derma-stamp": undefined,
  "fleur-cleanser-generic": undefined,
  "fleur-conditioner-generic": undefined,
  // "fleur-bond-mask": undefined,
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
