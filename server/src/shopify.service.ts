// Using built-in fetch (Node.js 18+)

// Shopify Admin API configuration
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ADMIN_ACCESS_TOKEN || !SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
  console.warn("⚠️  Shopify environment variables not configured. Please set:");
  console.warn("   SHOPIFY_STORE_DOMAIN");
  console.warn("   SHOPIFY_ADMIN_ACCESS_TOKEN");
  console.warn("   SHOPIFY_STOREFRONT_ACCESS_TOKEN");
}

/**
 * Create a discount code using Shopify Admin API with retry logic
 */
export async function createDiscountCode(
  code: string, 
  amount: number, 
  userId: string, 
  productSku: string
): Promise<{ success: boolean; discountCode: string; expiresAt: string }> {
  if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ADMIN_ACCESS_TOKEN) {
    throw new Error("Shopify Admin API not configured");
  }

  const domain = SHOPIFY_STORE_DOMAIN.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const url = `https://${domain}/admin/api/2024-07/graphql.json`;

  // Set expiration (24 hours from now)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const mutation = `
    mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
      discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
        codeDiscountNode {
          id
          codeDiscount {
            ... on DiscountCodeBasic {
              codes(first: 1) {
                nodes {
                  code
                }
              }
              status
              usageLimit
              startsAt
              endsAt
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

  const variables = {
    basicCodeDiscount: {
      title: `Points Redemption - ${productSku}`,
      code: code,
      startsAt: new Date().toISOString(),
      endsAt: expiresAt,
      usageLimit: 1,
      customerSelection: {
        all: true
      },
      customerGets: {
        value: {
          percentage: 1.0
        },
        items: {
          all: true
        }
      },
      minimumRequirement: {
        quantity: {
          greaterThanOrEqualToQuantity: "1"
        }
      },
      appliesOncePerCustomer: true
    }
  };

  // Enhanced retry logic for network issues
  let lastError: Error | null = null;
  let data: any = null;
  const maxRetries = 5; // Increased from 3 to 5
  const baseTimeout = 45000; // Increased from 30s to 45s
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries} to create discount code: ${code}`);
      
      // Progressive timeout: 45s, 60s, 75s, 90s, 105s
      const timeout = baseTimeout + (attempt - 1) * 15000;
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_ADMIN_ACCESS_TOKEN,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ query: mutation, variables }),
        signal: (() => {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), timeout);
          return controller.signal;
        })()
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Shopify Admin API error: ${response.status} – ${text}`);
      }

      data = await response.json();
      
      // If we get here, the request was successful
      console.log(`✅ Successfully created discount code on attempt ${attempt} (timeout: ${timeout}ms)`);
      break;
    } catch (error) {
      lastError = error as Error;
      const isTimeout = lastError.message.includes('aborted') || lastError.message.includes('timeout');
      const isNetworkError = lastError.message.includes('fetch failed') || lastError.message.includes('ETIMEDOUT');
      
      console.warn(`❌ Attempt ${attempt} failed (${isTimeout ? 'timeout' : isNetworkError ? 'network' : 'other'}):`, lastError.message);
      
      if (attempt === maxRetries) {
        throw new Error(`Failed to create discount code after ${maxRetries} attempts. Last error: ${lastError.message}`);
      }
      
      // Enhanced backoff with jitter: 1s, 2s, 4s, 8s, 16s + random 0-1s
      const baseDelay = Math.pow(2, attempt - 1) * 1000;
      const jitter = Math.random() * 1000; // 0-1s random
      const delay = Math.floor(baseDelay + jitter);
      
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

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
    success: true,
    discountCode: code,
    expiresAt: expiresAt
  };
}

/**
 * Create checkout with discount code using Shopify Storefront API
 */
export async function createCheckoutWithDiscount(
  productSku: string,
  userId: string,
  userPoints: number
): Promise<{ checkoutUrl: string; pointsUsed: number; discountAmount: number }> {
  if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
    throw new Error("Shopify Storefront API not configured");
  }

  // Get product point value (you'll need to implement this based on your catalog)
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
  await createDiscountCode(discountCode, discountAmount, userId, productSku);
  
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
  const domain = SHOPIFY_STORE_DOMAIN.replace(/^https?:\/\//, "").replace(/\/$/, "");
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

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_ACCESS_TOKEN,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query: CART_CREATE_WITH_DISCOUNT, variables }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify checkout creation failed: ${response.status} – ${text}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  const cart = data.data?.cartCreate?.cart;
  const errors = data.data?.cartCreate?.userErrors;

  if (errors && errors.length > 0) {
    throw new Error(`Checkout errors: ${errors.map((e: any) => e.message).join(', ')}`);
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
 * Fetch all products using Shopify Storefront API
 */
async function fetchAllProducts(): Promise<any[]> {
  if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
    throw new Error("Shopify Storefront API not configured");
  }

  const domain = SHOPIFY_STORE_DOMAIN.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const url = `https://${domain}/api/2024-07/graphql.json`;

  const query = `
    query getProducts($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            title
            handle
            description
            variants(first: 1) {
              edges {
                node {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                }
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
          }
        }
      }
    }
  `;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_ACCESS_TOKEN,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables: { first: 50 } }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch products: ${response.status}`);
  }

  const data = await response.json();
  return data.data?.products?.edges?.map((edge: any) => edge.node) || [];
}

/**
 * Get product point value (you'll need to implement this based on your catalog)
 */
function getProductPointValue(sku: string): number {
  // This should match your product catalog from the mobile app
  const productPointValues: Record<string, number> = {
    'bloom': 850,
    'detangling-comb': 250,
    'fleur-shampoo': 750,
    'fleur-conditioner': 780,
    'fleur-repair-mask': 900,
    'fleur-heat-shield': 700,
    'fleur-silk-pillowcase': 650,
    'fleur-derma-stamp': 725,
    'fleur-complete-kit': 3500,
    'fleur-biotin': 500,
    'fleur-vitamin-d3': 500,
    'fleur-iron': 500,
  };

  return productPointValues[sku] || 0;
}

/**
 * Create a 20% kit discount code
 */
export async function createKitDiscountCode(
  userId: string,
  cartItems: Array<{ sku: string; qty: number }>
): Promise<{ success: boolean; discountCode: string; expiresAt: string }> {
  if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ADMIN_ACCESS_TOKEN) {
    throw new Error("Shopify Admin API not configured");
  }

  // Generate unique discount code for kit
  const timestamp = Date.now();
  const code = `KIT_20_${userId.slice(-6)}_${timestamp}`;
  
  // Set expiration (24 hours from now)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const domain = SHOPIFY_STORE_DOMAIN.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const url = `https://${domain}/admin/api/2024-07/graphql.json`;

  const mutation = `
    mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
      discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
        codeDiscountNode {
          id
          codeDiscount {
            ... on DiscountCodeBasic {
              codes(first: 1) {
                nodes {
                  code
                }
              }
              status
              usageLimit
              startsAt
              endsAt
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

  const variables = {
    basicCodeDiscount: {
      title: `Kit Bundle 20% Off - ${userId}`,
      code: code,
      startsAt: new Date().toISOString(),
      endsAt: expiresAt,
      usageLimit: 1,
      customerSelection: {
        all: true
      },
      customerGets: {
        value: {
          percentage: 0.2  // 20% discount
        },
        items: {
          all: true
        }
      },
      minimumRequirement: {
        quantity: {
          greaterThanOrEqualToQuantity: "1"
        }
      },
      appliesOncePerCustomer: true
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": SHOPIFY_ADMIN_ACCESS_TOKEN,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query: mutation, variables }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify Admin API error: ${response.status} – ${text}`);
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
    success: true,
    discountCode: code,
    expiresAt: expiresAt
  };
}
