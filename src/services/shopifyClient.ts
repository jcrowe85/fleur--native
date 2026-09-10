// src/services/shopifyClient.ts
// Cart/checkout helpers for the Shopify Storefront API.
//
// Read-only storefront traffic (products, cart creation) goes direct from the
// app. Anything that creates money — discount codes, point redemptions — goes
// through our API server, which holds the Admin token and does the authorising.

import {
  API_BASE,
  SHOPIFY_STORE_DOMAIN as STORE_DOMAIN,
  SHOPIFY_STOREFRONT_TOKEN as STOREFRONT_TOKEN,
} from "@/config/env";

if (__DEV__ && (!STORE_DOMAIN || !STOREFRONT_TOKEN)) {
  console.warn(
    "[shopifyClient] Missing EXPO_PUBLIC_SHOPIFY_STORE_DOMAIN or EXPO_PUBLIC_SHOPIFY_STOREFRONT_TOKEN"
  );
}

export type LineItem = { variantId: string; quantity: number };

// Shopify Product Types
export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  description: string;
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  images: {
    edges: Array<{
      node: {
        url: string;
        altText?: string;
      };
    }>;
  };
  tags: string[];
  productType?: string;
  vendor?: string;
  variants?: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        price: {
          amount: string;
          currencyCode: string;
        };
        availableForSale: boolean;
        sku?: string;
      };
    }>;
  };
}

// If you were passing numeric variant IDs, convert to GID
function toGid(variantId: string): string {
  if (!variantId) return variantId;
  if (variantId.startsWith("gid://")) return variantId;
  if (/^\d+$/.test(variantId)) return `gid://shopify/ProductVariant/${variantId}`;
  return variantId;
}

// GraphQL: create a Cart with lines (Cart API)
const CART_CREATE = /* GraphQL */ `
  mutation CartCreate($input: CartInput) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
        cost {
          totalAmount {
            amount
            currencyCode
          }
        }
        discountCodes {
          code
          applicable
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * Create a Shopify Cart and return the hosted checkout URL.
 * NOTE: This replaces any previous "checkoutCreate" usage.
 */
export async function createCheckout(lineItems: LineItem[], discountCode?: string) {
  const domain = String(STORE_DOMAIN).replace(/^https?:\/\//, "").replace(/\/$/, "");
  const url = `https://${domain}/api/2024-07/graphql.json`;

  const variables = {
    input: {
      lines: lineItems.map((li) => ({
        quantity: li.quantity,
        merchandiseId: toGid(li.variantId),
      })),
      ...(discountCode && { discountCodes: [discountCode] }),
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "X-Shopify-Storefront-Access-Token": String(STOREFRONT_TOKEN),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query: CART_CREATE, variables }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Shopify error: ${res.status} – ${txt}`);
  }

  const data = (await res.json()) as any;

  const gqlErrors = data?.errors;
  if (Array.isArray(gqlErrors) && gqlErrors.length) {
    throw new Error(gqlErrors.map((e: any) => e?.message).join("; "));
  }

  const userErrors = data?.data?.cartCreate?.userErrors;
  if (Array.isArray(userErrors) && userErrors.length) {
    throw new Error(userErrors.map((e: any) => e?.message).join("; "));
  }

  const cart = data?.data?.cartCreate?.cart;
  const checkoutUrl: string | undefined = cart?.checkoutUrl;

  if (!checkoutUrl) {
    throw new Error("No checkoutUrl returned from Shopify.");
  }

  // Debug logging for discount verification
  if (discountCode) {
    console.log("🎫 Discount code used:", discountCode);
    console.log("💰 Cart total:", cart?.cost?.totalAmount?.amount);
    console.log("✅ Discount codes:", cart?.discountCodes);
    
    const applicableDiscount = cart?.discountCodes?.find((dc: any) => dc.code === discountCode);
    if (applicableDiscount) {
      console.log("✅ Discount is applicable:", applicableDiscount.applicable);
    } else {
      console.warn("⚠️ Discount code not found in cart response");
    }
  }

  // Keep the return shape your CartScreen expects
  return { id: cart.id as string, webUrl: checkoutUrl };
}

// GraphQL: Fetch products with optional filtering
const PRODUCTS_QUERY = /* GraphQL */ `
  query getProducts($first: Int!, $query: String, $after: String) {
    products(first: $first, query: $query, after: $after) {
      edges {
        node {
          id
          title
          handle
          description
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 5) {
            edges {
              node {
                url
                altText
              }
            }
          }
          tags
          productType
          vendor
          variants(first: 10) {
            edges {
              node {
                id
                title
                price {
                  amount
                  currencyCode
                }
                availableForSale
                sku
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

/**
 * Fetch products from Shopify Storefront API
 * @param options - Query options
 * @returns Promise<ShopifyProduct[]>
 */
export async function fetchProducts(options: {
  first?: number;
  query?: string;
  after?: string;
} = {}): Promise<ShopifyProduct[]> {
  if (!STORE_DOMAIN || !STOREFRONT_TOKEN) {
    throw new Error("Shopify credentials not configured");
  }

  const domain = String(STORE_DOMAIN).replace(/^https?:\/\//, "").replace(/\/$/, "");
  const url = `https://${domain}/api/2024-07/graphql.json`;

  const variables = {
    first: options.first || 20,
    query: options.query,
    after: options.after,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-Shopify-Storefront-Access-Token": String(STOREFRONT_TOKEN),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ 
      query: PRODUCTS_QUERY, 
      variables 
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Shopify API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(`GraphQL errors: ${data.errors.map((e: any) => e.message).join(", ")}`);
  }

  return data.data.products.edges.map((edge: any) => edge.node);
}

/**
 * Fetch redeemable products (products with specific tags)
 * @param tag - Tag to filter by (default: "redeemable-with-points")
 * @returns Promise<ShopifyProduct[]>
 */
export async function fetchRedeemableProducts(tag: string = "redeemable-with-points"): Promise<ShopifyProduct[]> {
  // Use the same backend API as fetchAllProducts to ensure consistency
  try {
    const serverUrl = API_BASE;
    const response = await fetch(`${serverUrl}/api/shopify/products?tag=${encodeURIComponent(tag)}`);

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    const redeemableProducts = data.products || [];

    console.log(`Found ${redeemableProducts.length} redeemable products (tag: ${tag})`);

    return redeemableProducts.map((product: any) => ({
      id: product.id,
      handle: product.handle,
      title: product.title,
      description: product.description,
      tags: product.tags,
      priceRange: product.priceRange,
      images: product.images,
      variants: product.variants,
      productType: product.productType || "Product"
    }));
  } catch (error) {
    console.warn('Backend API failed for redeemable products, falling back to direct Shopify API:', error);
    return fetchProducts({
      query: `tag:${tag}`,
      first: 50, // Get more products for redeemable section
    });
  }
}

/**
 * Fetch all products (for general shop display)
 * @returns Promise<ShopifyProduct[]>
 */
export async function fetchAllProducts(): Promise<ShopifyProduct[]> {
  // Try backend API first, fallback to direct Shopify API
  try {
    const serverUrl = API_BASE;
    const response = await fetch(`${serverUrl}/api/shopify/products`);
    
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📦 Fetched products from backend API:', data.products?.length || 0);
    
    // Transform backend response to match ShopifyProduct interface
    return (data.products || []).map((product: any) => ({
      id: product.id || `gid://shopify/Product/${product.handle}`,
      title: product.title,
      handle: product.handle,
      description: product.description || '',
      priceRange: product.priceRange || {
        minVariantPrice: {
          amount: '0.00',
          currencyCode: 'USD'
        }
      },
      images: product.images || {
        edges: []
      },
      tags: product.tags || [],
      productType: product.productType,
      vendor: product.vendor,
      variants: product.variants || {
        edges: []
      }
    }));
  } catch (error) {
    console.warn('Backend API failed, falling back to direct Shopify API:', error);
    return fetchProducts({
      first: 50,
    });
  }
}

// ---------------------------------------------------------------------------
// Point redemption
//
// All discount-code creation happens on our API server, which authenticates the
// caller, resolves the point price from its own catalog, and records the
// redemption. The client previously tried to call Shopify's
// `discountCodeBasicCreate` directly with the *Storefront* token — a mutation
// that only exists on the Admin API — so that path could never have worked, and
// the server path it fell back to accepted an arbitrary discount amount from
// whatever called it.
// ---------------------------------------------------------------------------

export interface PointRedemption {
  redemptionId: string;
  pointsUsed: number;
  productTitle: string;
  checkoutUrl: string;
  expiresAt: string;
}

/** Attach the caller's Supabase access token to a request to our API. */
async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { supabase } = await import("./supabase");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    throw new Error("You need to be signed in to do that.");
  }

  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
}

/** Read `{ error }` from a failed API response without throwing on bad JSON. */
async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return typeof body?.error === "string" ? body.error : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Ask the server to issue a point redemption and return a checkout with the
 * reward already applied.
 *
 * `availablePoints` is advisory — the server enforces the real limits — but
 * sending it lets the server reject an obviously ineligible request early.
 */
export async function createPointRedemption(
  productSku: string,
  availablePoints: number
): Promise<PointRedemption> {
  const res = await authedFetch("/api/shopify/redeem", {
    method: "POST",
    body: JSON.stringify({ productSku, availablePoints }),
  });

  if (!res.ok) {
    throw new Error(await readError(res, "Could not create your redemption."));
  }

  return res.json();
}

/** Tell the server a redemption checkout completed, so the code is consumed. */
export async function completePointRedemption(redemptionId: string): Promise<void> {
  const res = await authedFetch(`/api/shopify/redeem/${redemptionId}/complete`, {
    method: "POST",
  });
  if (!res.ok) {
    console.warn("[redeem] failed to mark redemption complete:", await readError(res, ""));
  }
}

/**
 * Release a redemption the user backed out of, so its discount code is
 * deactivated and they are not blocked from redeeming again.
 */
export async function cancelPointRedemption(redemptionId: string): Promise<void> {
  const res = await authedFetch(`/api/shopify/redeem/${redemptionId}/cancel`, {
    method: "POST",
  });
  if (!res.ok) {
    console.warn("[redeem] failed to cancel redemption:", await readError(res, ""));
  }
}

/** Point prices straight from the server catalog. */
export async function fetchPointCatalog(): Promise<Record<string, number>> {
  const res = await fetch(`${API_BASE}/api/shopify/point-catalog`);
  if (!res.ok) throw new Error("Could not load point prices");

  const body = (await res.json()) as { products: Array<{ sku: string; points: number }> };
  return Object.fromEntries(body.products.map((p) => [p.sku, p.points]));
}

/**
 * Create the 20%-off kit bundle code. The server derives the user from the JWT
 * and validates that the cart actually qualifies.
 */
export async function createKitDiscountCode(
  cartItems: Array<{ sku: string; qty: number }>
): Promise<{ success: boolean; discountCode: string; expiresAt: string }> {
  const res = await authedFetch("/api/shopify/kit-discount", {
    method: "POST",
    body: JSON.stringify({ cartItems }),
  });

  if (!res.ok) {
    throw new Error(await readError(res, "Could not create your bundle discount."));
  }

  return res.json();
}
