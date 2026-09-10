// server/src/shopify.service.ts
// Using built-in fetch (Node.js 18+)

import { canonicalSku, getProductPointValue } from "./points.catalog";

// Shopify Admin API configuration
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

const ADMIN_API_VERSION = "2024-07";
const STOREFRONT_API_VERSION = "2024-07";

/** How long an issued redemption code stays valid. */
const CODE_TTL_MS = 24 * 60 * 60 * 1000;

if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ADMIN_ACCESS_TOKEN || !SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
  console.warn("⚠️  Shopify environment variables not configured. Please set:");
  console.warn("   SHOPIFY_STORE_DOMAIN");
  console.warn("   SHOPIFY_ADMIN_ACCESS_TOKEN");
  console.warn("   SHOPIFY_STOREFRONT_ACCESS_TOKEN");
}

function adminUrl(): string {
  const domain = String(SHOPIFY_STORE_DOMAIN).replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `https://${domain}/admin/api/${ADMIN_API_VERSION}/graphql.json`;
}

function storefrontUrl(): string {
  const domain = String(SHOPIFY_STORE_DOMAIN).replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `https://${domain}/api/${STOREFRONT_API_VERSION}/graphql.json`;
}

/** Discount codes are generated server-side only; a client-supplied code is ignored. */
function generateCode(prefix: string, userId: string): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${userId.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

async function shopifyFetch(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  { retries = 3, timeoutMs = 20000 }: { retries?: number; timeoutMs?: number } = {}
): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...headers },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        // 4xx other than 429 will never succeed on retry — fail fast.
        if (response.status < 500 && response.status !== 429) {
          throw new Error(`Shopify API error: ${response.status} – ${text}`);
        }
        throw new Error(`Shopify API transient error: ${response.status} – ${text}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error as Error;
      const fatal = /Shopify API error: 4/.test(lastError.message);
      if (fatal || attempt === retries) throw lastError;

      const delay = Math.floor(Math.pow(2, attempt - 1) * 500 + Math.random() * 500);
      console.warn(`[shopify] attempt ${attempt}/${retries} failed (${lastError.message}); retrying in ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError ?? new Error("Shopify request failed");
}

function assertNoGraphqlErrors(data: any, mutationKey: string): any {
  if (data?.errors?.length) {
    throw new Error(`GraphQL errors: ${data.errors.map((e: any) => e.message).join(", ")}`);
  }
  const payload = data?.data?.[mutationKey];
  const userErrors = payload?.userErrors;
  if (Array.isArray(userErrors) && userErrors.length) {
    throw new Error(`${mutationKey} errors: ${userErrors.map((e: any) => e.message).join(", ")}`);
  }
  return payload;
}

const DISCOUNT_CODE_BASIC_CREATE = `
  mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
    discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
      codeDiscountNode {
        id
        codeDiscount {
          ... on DiscountCodeBasic {
            codes(first: 1) { nodes { code } }
            status
            usageLimit
            startsAt
            endsAt
          }
        }
      }
      userErrors { field message }
    }
  }
`;

/**
 * Mint a single-use discount that makes ONE unit of ONE specific variant free.
 *
 * This replaces the previous implementation, which built
 *   customerGets: { value: { percentage: 1.0 }, items: { all: true } }
 * — i.e. 100% off the customer's entire cart — while silently ignoring the
 * `amount` it was passed. Any point redemption handed the user a code that
 * zeroed out an order of any size.
 *
 * Scoping the discount to the redeemed variant is what the redemption UI
 * actually promises ("redeem N points for this product") and it stays correct
 * no matter what else the customer adds to the cart.
 */
export async function createProductRedemptionDiscount(params: {
  userId: string;
  productSku: string;
  variantId: string;
  productTitle: string;
  /** Price of one unit, as a decimal string — the value being given away. */
  unitPrice: string;
}): Promise<{ discountCode: string; discountNodeId: string; expiresAt: string }> {
  if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ADMIN_ACCESS_TOKEN) {
    throw new Error("Shopify Admin API not configured");
  }

  const code = generateCode("PTS", params.userId);
  const startsAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  const variables = {
    basicCodeDiscount: {
      title: `Points redemption — ${params.productTitle} (${params.userId.slice(0, 8)})`,
      code,
      startsAt,
      endsAt: expiresAt,
      usageLimit: 1,
      appliesOncePerCustomer: true,
      customerSelection: { all: true },
      customerGets: {
        // A fixed amount equal to one unit's price, restricted to the redeemed
        // variant and NOT applied per item.
        //
        // `discountOnQuantity` is rejected here — Shopify permits it only on
        // BXGY discounts ("discountOnQuantity field is only permitted with bxgy
        // discounts"), so the earlier shape could never have been created. A
        // flat `percentage: 1.0` would work but discounts *every* unit of that
        // variant in the cart, so adding three would make all three free.
        // Capping at one unit's value gives away exactly what was redeemed.
        value: {
          discountAmount: {
            amount: params.unitPrice,
            appliesOnEachItem: false,
          },
        },
        items: {
          products: { productVariantsToAdd: [params.variantId] },
        },
      },
    },
  };

  const data = await shopifyFetch(
    adminUrl(),
    { "X-Shopify-Access-Token": String(SHOPIFY_ADMIN_ACCESS_TOKEN) },
    { query: DISCOUNT_CODE_BASIC_CREATE, variables }
  );

  const payload = assertNoGraphqlErrors(data, "discountCodeBasicCreate");
  const nodeId = payload?.codeDiscountNode?.id;
  if (!nodeId) throw new Error("Shopify did not return a discount node");

  return { discountCode: code, discountNodeId: nodeId, expiresAt };
}

/** Percentage of the cart taken off by the kit bundle promotion. */
const KIT_DISCOUNT_PERCENTAGE = 0.2;

/** Minimum distinct items required to qualify for the kit bundle discount. */
const KIT_MIN_ITEMS = 3;

export async function createKitDiscountCode(
  userId: string,
  cartItems: Array<{ sku: string; qty: number }>
): Promise<{ success: boolean; discountCode: string; expiresAt: string }> {
  if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ADMIN_ACCESS_TOKEN) {
    throw new Error("Shopify Admin API not configured");
  }

  const distinctItems = new Set(
    (cartItems ?? []).filter((i) => i && i.sku && Number(i.qty) > 0).map((i) => canonicalSku(i.sku))
  );
  if (distinctItems.size < KIT_MIN_ITEMS) {
    throw new Error(`Kit discount requires at least ${KIT_MIN_ITEMS} different products`);
  }

  const code = generateCode("KIT20", userId);
  const startsAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  const variables = {
    basicCodeDiscount: {
      title: `Kit bundle 20% off (${userId.slice(0, 8)})`,
      code,
      startsAt,
      endsAt: expiresAt,
      usageLimit: 1,
      appliesOncePerCustomer: true,
      customerSelection: { all: true },
      customerGets: {
        value: { percentage: KIT_DISCOUNT_PERCENTAGE },
        items: { all: true },
      },
      minimumRequirement: {
        quantity: { greaterThanOrEqualToQuantity: String(KIT_MIN_ITEMS) },
      },
    },
  };

  const data = await shopifyFetch(
    adminUrl(),
    { "X-Shopify-Access-Token": String(SHOPIFY_ADMIN_ACCESS_TOKEN) },
    { query: DISCOUNT_CODE_BASIC_CREATE, variables }
  );

  assertNoGraphqlErrors(data, "discountCodeBasicCreate");
  return { success: true, discountCode: code, expiresAt };
}

/** Deactivate a code that was minted but never used (e.g. checkout abandoned). */
export async function revokeDiscountNode(discountNodeId: string): Promise<void> {
  if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ADMIN_ACCESS_TOKEN) return;

  const mutation = `
    mutation discountCodeDeactivate($id: ID!) {
      discountCodeDeactivate(id: $id) {
        userErrors { field message }
      }
    }
  `;

  try {
    const data = await shopifyFetch(
      adminUrl(),
      { "X-Shopify-Access-Token": String(SHOPIFY_ADMIN_ACCESS_TOKEN) },
      { query: mutation, variables: { id: discountNodeId } },
      { retries: 2 }
    );
    assertNoGraphqlErrors(data, "discountCodeDeactivate");
  } catch (error) {
    // Best effort — the code expires on its own within CODE_TTL_MS.
    console.warn("[shopify] failed to deactivate discount", discountNodeId, error);
  }
}

/** Fields the app needs for every product it renders. */
const PRODUCT_FIELDS = `
  id
  handle
  title
  description
  tags
  priceRange { minVariantPrice { amount currencyCode } }
  images(first: 1) { edges { node { url altText } } }
  variants(first: 10) {
    edges { node { id title price { amount currencyCode } availableForSale } }
  }
`;

/**
 * Fetch specific products by handle.
 *
 * Shopify excludes UNLISTED products from `products(first:)` listing queries but
 * still returns them from `product(handle:)`. Every product tagged
 * redeemable-with-points on this store is UNLISTED, so a listing-based fetch
 * returned none of them and the rewards catalog came back empty. Aliasing one
 * lookup per handle into a single request sidesteps that and avoids the
 * listing's 50-item ceiling.
 */
export async function fetchProductsByHandles(handles: string[]): Promise<any[]> {
  const unique = Array.from(new Set(handles.map(canonicalSku).filter(Boolean)));
  if (unique.length === 0) return [];

  // GraphQL aliases must be valid names, so map each handle to a safe alias.
  const aliases = unique.map((h, i) => ({ alias: `p${i}`, handle: h }));
  const query = `query ProductsByHandle {
    ${aliases.map(({ alias, handle }) =>
      `${alias}: product(handle: ${JSON.stringify(handle)}) { ${PRODUCT_FIELDS} }`
    ).join("\n    ")}
  }`;

  const data = await shopifyFetch(
    storefrontUrl(),
    { "X-Shopify-Storefront-Access-Token": String(SHOPIFY_STOREFRONT_ACCESS_TOKEN) },
    { query }
  );

  if (data?.errors?.length) {
    throw new Error(data.errors.map((e: any) => e.message).join(", "));
  }

  return aliases
    .map(({ alias }) => data?.data?.[alias])
    .filter((p: any) => p && p.handle);
}

const PRODUCT_BY_HANDLE = `
  query productByHandle($handle: String!) {
    product(handle: $handle) {
      id
      title
      handle
      variants(first: 1) {
        edges { node { id title availableForSale price { amount currencyCode } } }
      }
    }
  }
`;

/** Resolve a SKU/handle to its first sellable variant via the Storefront API. */
export async function resolveVariant(
  productSku: string
): Promise<{ variantId: string; title: string; price: string; currencyCode: string }> {
  if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
    throw new Error("Shopify Storefront API not configured");
  }

  const handle = canonicalSku(productSku);
  const data = await shopifyFetch(
    storefrontUrl(),
    { "X-Shopify-Storefront-Access-Token": String(SHOPIFY_STOREFRONT_ACCESS_TOKEN) },
    { query: PRODUCT_BY_HANDLE, variables: { handle } }
  );

  if (data?.errors?.length) {
    throw new Error(`GraphQL errors: ${data.errors.map((e: any) => e.message).join(", ")}`);
  }

  const product = data?.data?.product;
  const variant = product?.variants?.edges?.[0]?.node;
  if (!product || !variant) {
    throw new Error(`Product "${handle}" not found in Shopify`);
  }
  if (!variant.availableForSale) {
    throw new Error(`Product "${product.title}" is out of stock`);
  }

  return {
    variantId: variant.id,
    title: product.title,
    price: variant.price?.amount ?? "0",
    currencyCode: variant.price?.currencyCode ?? "USD",
  };
}

const CART_CREATE = `
  mutation CartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
        cost { totalAmount { amount currencyCode } }
        discountCodes { code applicable }
      }
      userErrors { field message }
    }
  }
`;

/**
 * Build a checkout containing exactly the redeemed product with the redemption
 * code pre-applied.
 *
 * `pointsRequired` is resolved from the server catalog. The caller is
 * responsible for having already reserved the points (see redemption.service).
 */
export async function createRedemptionCheckout(params: {
  userId: string;
  productSku: string;
}): Promise<{
  checkoutUrl: string;
  pointsUsed: number;
  discountCode: string;
  discountNodeId: string;
  expiresAt: string;
  productTitle: string;
}> {
  const sku = canonicalSku(params.productSku);
  const pointsRequired = getProductPointValue(sku);
  if (pointsRequired === 0) {
    throw new Error(`Product "${params.productSku}" is not redeemable with points`);
  }

  const variant = await resolveVariant(sku);

  const discount = await createProductRedemptionDiscount({
    userId: params.userId,
    productSku: sku,
    variantId: variant.variantId,
    productTitle: variant.title,
    unitPrice: variant.price,
  });

  try {
    const data = await shopifyFetch(
      storefrontUrl(),
      { "X-Shopify-Storefront-Access-Token": String(SHOPIFY_STOREFRONT_ACCESS_TOKEN) },
      {
        query: CART_CREATE,
        variables: {
          input: {
            lines: [{ merchandiseId: variant.variantId, quantity: 1 }],
            discountCodes: [discount.discountCode],
          },
        },
      }
    );

    const payload = assertNoGraphqlErrors(data, "cartCreate");
    const checkoutUrl = payload?.cart?.checkoutUrl;
    if (!checkoutUrl) throw new Error("Shopify did not return a checkout URL");

    const applied = payload?.cart?.discountCodes?.find(
      (d: any) => d?.code === discount.discountCode
    );
    if (applied && applied.applicable === false) {
      throw new Error("Redemption discount was rejected by Shopify");
    }

    return {
      checkoutUrl,
      pointsUsed: pointsRequired,
      discountCode: discount.discountCode,
      discountNodeId: discount.discountNodeId,
      expiresAt: discount.expiresAt,
      productTitle: variant.title,
    };
  } catch (error) {
    // Don't leave a live free-product code behind if the cart failed to build.
    await revokeDiscountNode(discount.discountNodeId);
    throw error;
  }
}
