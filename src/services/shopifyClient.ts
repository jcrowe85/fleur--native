// src/services/shopifyClient.ts
// Cart/checkout helpers for Shopify Storefront API

// Public envs (available at runtime in Expo)
const STORE_DOMAIN = process.env.EXPO_PUBLIC_SHOPIFY_STORE_DOMAIN;
const STOREFRONT_TOKEN = process.env.EXPO_PUBLIC_SHOPIFY_STOREFRONT_TOKEN;

if (!STORE_DOMAIN || !STOREFRONT_TOKEN) {
  console.warn(
    "[shopifyClient] Missing EXPO_PUBLIC_SHOPIFY_STORE_DOMAIN or EXPO_PUBLIC_SHOPIFY_STOREFRONT_TOKEN"
  );
}

export type LineItem = { variantId: string; quantity: number };

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
export async function createCheckout(lineItems: LineItem[]) {
  const domain = String(STORE_DOMAIN).replace(/^https?:\/\//, "").replace(/\/$/, "");
  const url = `https://${domain}/api/2024-07/graphql.json`;

  const variables = {
    input: {
      lines: lineItems.map((li) => ({
        quantity: li.quantity,
        merchandiseId: toGid(li.variantId),
      })),
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

  // Keep the return shape your CartScreen expects
  return { id: cart.id as string, webUrl: checkoutUrl };
}
