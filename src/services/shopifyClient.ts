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
          images(first: 1) {
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
  return fetchProducts({
    query: `tag:${tag}`,
    first: 50, // Get more products for redeemable section
  });
}

/**
 * Fetch all products (for general shop display)
 * @returns Promise<ShopifyProduct[]>
 */
export async function fetchAllProducts(): Promise<ShopifyProduct[]> {
  return fetchProducts({
    first: 50,
  });
}

// Discount Code Types
export interface DiscountCode {
  id: string;
  code: string;
  amount: number;
  type: 'fixed_amount' | 'percentage';
  expiresAt?: string;
}

export interface PointRedemption {
  pointsUsed: number;
  discountAmount: number;
  discountCode: string;
  expiresAt: string;
}

// GraphQL: Create discount code
const DISCOUNT_CODE_CREATE = /* GraphQL */ `
  mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
    discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
      codeDiscountNode {
        id
        codeDiscount {
          ... on DiscountCodeBasic {
            codes(first: 1) {
              edges {
                node {
                  code
                }
              }
            }
            status
            summary
            title
            usageLimit
            startsAt
            endsAt
            customerSelection {
              ... on DiscountCustomerAll {
                allCustomers
              }
            }
            customerGets {
              value {
                ... on DiscountPercentage {
                  percentage
                }
                ... on DiscountAmount {
                  amount {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
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
 * Create a discount code for point redemption
 * @param productSku - Product SKU to determine point value
 * @param userId - User ID for unique code generation
 * @returns Promise<PointRedemption>
 */
export async function createPointDiscountCode(productSku: string, userId: string): Promise<PointRedemption> {
  if (!STORE_DOMAIN || !STOREFRONT_TOKEN) {
    throw new Error("Shopify credentials not configured");
  }

  // Get product point value from catalog
  const { getProductPointValue } = require("@/data/productPointCatalog");
  const pointsRequired = getProductPointValue(productSku);
  
  if (pointsRequired === 0) {
    throw new Error(`Product ${productSku} not found in point catalog`);
  }

  // Convert points to dollars (1 point = $0.10)
  const discountAmount = pointsRequired * 0.10;
  
  // Generate unique discount code
  const timestamp = Date.now();
  const code = `POINTS_${userId.slice(-6)}_${timestamp}`;
  
  // Set expiration (24 hours from now)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  
  const domain = String(STORE_DOMAIN).replace(/^https?:\/\//, "").replace(/\/$/, "");
  const url = `https://${domain}/api/2024-07/graphql.json`;

  const variables = {
    basicCodeDiscount: {
      title: `Points Redemption - ${pointsRequired} points`,
      code: code,
      startsAt: new Date().toISOString(),
      endsAt: expiresAt,
      usageLimit: 1, // Single use only
      customerSelection: {
        allCustomers: true
      },
      customerGets: {
        value: {
          fixedAmount: {
            amount: discountAmount.toFixed(2),
            currencyCode: "USD"
          }
        }
      },
      minimumRequirement: {
        quantity: 1
      }
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-Shopify-Storefront-Access-Token": String(STOREFRONT_TOKEN),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ 
      query: DISCOUNT_CODE_CREATE, 
      variables 
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Shopify discount creation error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(`GraphQL errors: ${data.errors.map((e: any) => e.message).join(", ")}`);
  }

  const userErrors = data?.data?.discountCodeBasicCreate?.userErrors;
  if (Array.isArray(userErrors) && userErrors.length) {
    throw new Error(`Discount creation errors: ${userErrors.map((e: any) => e.message).join(", ")}`);
  }

  const discountNode = data?.data?.discountCodeBasicCreate?.codeDiscountNode;
  if (!discountNode) {
    throw new Error("No discount code created");
  }

  return {
    pointsUsed: pointsRequired,
    discountAmount: discountAmount,
    discountCode: code,
    expiresAt: expiresAt
  };
}

/**
 * Calculate point redemption for a specific product
 * @param productSku - Product SKU to look up point value
 * @param userPoints - User's available points
 * @returns Object with redemption details
 */
export function calculatePointRedemption(productSku: string, userPoints: number) {
  // Import the product catalog
  const { getProductPointValue, canAffordProduct } = require("@/data/productPointCatalog");
  
  const pointsRequired = getProductPointValue(productSku);
  const canAfford = canAffordProduct(productSku, userPoints);
  
  return {
    pointsRequired: pointsRequired,
    pointsToUse: canAfford ? pointsRequired : 0,
    canAfford: canAfford,
    remainingPoints: Math.max(0, userPoints - pointsRequired),
    savings: canAfford ? pointsRequired : 0
  };
}

/**
 * Calculate point redemption for a product by price (fallback method)
 * @param productPrice - Product price in dollars
 * @param userPoints - User's available points
 * @returns Object with points needed and remaining cost
 */
export function calculatePointRedemptionByPrice(productPrice: number, userPoints: number) {
  const maxPointsToUse = Math.min(userPoints, productPrice);
  const remainingCost = productPrice - maxPointsToUse;
  
  return {
    pointsToUse: maxPointsToUse,
    remainingCost: remainingCost,
    canAfford: userPoints >= productPrice,
    savings: maxPointsToUse
  };
}

/**
 * Create a seamless checkout URL with discount pre-applied using Admin API
 * This creates the discount code via Admin API, then creates checkout with it applied
 */
export async function createSeamlessCheckoutWithDiscount(
  productSku: string, 
  userId: string, 
  userPoints: number
): Promise<{ checkoutUrl: string; pointsUsed: number; discountAmount: number }> {
  if (!STORE_DOMAIN || !STOREFRONT_TOKEN) {
    throw new Error("Shopify credentials not configured");
  }

  // Get product point value from catalog
  const { getProductPointValue } = require("@/data/productPointCatalog");
  const pointsRequired = getProductPointValue(productSku);
  
  if (pointsRequired === 0) {
    throw new Error(`Product ${productSku} not found in point catalog`);
  }

  if (userPoints < pointsRequired) {
    throw new Error(`Insufficient points. Need ${pointsRequired}, have ${userPoints}`);
  }

  // Convert points to dollars (1 point = $0.10)
  const discountAmount = pointsRequired * 0.10;
  
  // Generate unique discount code
  const timestamp = Date.now();
  const discountCode = `POINTS_${userId.slice(-6)}_${timestamp}`;
  
  // Step 1: Create discount code using Admin API
  await createDiscountCodeViaAdminAPI(discountCode, discountAmount, userId, productSku);
  
  // Step 2: Find the product variant
  const products = await fetchAllProducts();
  const product = products.find(p => {
    const handle = p.handle?.toLowerCase();
    const titleSlug = p.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return handle === productSku || titleSlug === productSku || 
           handle?.includes(productSku) || titleSlug.includes(productSku);
  });

  if (!product || !product.variants?.edges?.[0]?.node) {
    throw new Error(`Product ${productSku} not found in Shopify`);
  }

  const variant = product.variants.edges[0].node;
  
  // Step 3: Create checkout with discount code applied
  const domain = String(STORE_DOMAIN).replace(/^https?:\/\//, "").replace(/\/$/, "");
  const url = `https://${domain}/api/2024-07/graphql.json`;

  const CART_CREATE_WITH_DISCOUNT = `
    mutation CartCreate($input: CartInput!) {
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

  const variables = {
    input: {
      lines: [{
        merchandiseId: variant.id,
        quantity: 1
      }],
      discountCodes: [discountCode]
    }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "X-Shopify-Storefront-Access-Token": String(STOREFRONT_TOKEN),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query: CART_CREATE_WITH_DISCOUNT, variables }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Shopify checkout creation failed: ${res.status} – ${txt}`);
  }

  const data = await res.json();
  
  if (data.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  const cart = data.data?.cartCreate?.cart;
  const errors = data.data?.cartCreate?.userErrors;

  if (errors && errors.length > 0) {
    throw new Error(`Checkout errors: ${errors.map(e => e.message).join(', ')}`);
  }

  if (!cart?.checkoutUrl) {
    throw new Error("Failed to create cart checkout URL");
  }

  return {
    checkoutUrl: cart.checkoutUrl,
    pointsUsed: pointsRequired,
    discountAmount: discountAmount
  };
}

/**
 * Create discount code using Shopify Admin API via our server
 */
async function createDiscountCodeViaAdminAPI(code: string, amount: number, userId: string, productSku: string): Promise<void> {
  const serverUrl = process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:3000';
  
  try {
    const response = await fetch(`${serverUrl}/api/shopify/discount-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        amount,
        userId,
        productSku
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create discount code');
    }

    const result = await response.json();
    console.log('Discount code created successfully:', result);
  } catch (error) {
    console.error('Error creating discount code:', error);
    throw error;
  }
}
