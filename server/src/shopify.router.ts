import express from "express";
import { requireAuth, type AuthedRequest } from "./auth.middleware";
import { createKitDiscountCode, fetchProductsByHandles } from "./shopify.service";
import { redeemableSkus } from "./points.catalog";
import {
  issueRedemption,
  markRedemptionCompleted,
  cancelRedemption,
  RedemptionError,
} from "./redemption.service";

const router = express.Router();

function fail(res: express.Response, error: unknown, fallback: string) {
  if (error instanceof RedemptionError) {
    return res.status(error.status).json({ error: error.message });
  }
  console.error(fallback, error);
  // Internal messages can carry Shopify/API detail — don't leak them to clients.
  return res.status(500).json({ error: fallback });
}

/**
 * Issue a point-redemption checkout.
 *
 * The user id comes from the verified JWT and the point cost from the server
 * catalog. Previously this route accepted `code`, `amount` and `userId` straight
 * from the body with no authentication at all, so anyone on the internet could
 * mint arbitrary discount codes against the store.
 */
router.post("/redeem", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { productSku, availablePoints } = req.body ?? {};
    if (typeof productSku !== "string" || !productSku.trim()) {
      return res.status(400).json({ error: "productSku is required" });
    }

    const result = await issueRedemption({
      userId: req.userId!,
      productSku: productSku.trim(),
      clientReportedPoints:
        typeof availablePoints === "number" ? availablePoints : undefined,
    });

    res.json(result);
  } catch (error) {
    fail(res, error, "Failed to create redemption");
  }
});

/** Mark a previously issued redemption as consumed. */
router.post("/redeem/:id/complete", requireAuth, async (req: AuthedRequest, res) => {
  try {
    await markRedemptionCompleted(req.userId!, req.params.id);
    res.json({ ok: true });
  } catch (error) {
    fail(res, error, "Failed to complete redemption");
  }
});

/** Release an unused redemption (checkout abandoned) and kill its code. */
router.post("/redeem/:id/cancel", requireAuth, async (req: AuthedRequest, res) => {
  try {
    await cancelRedemption(req.userId!, req.params.id);
    res.json({ ok: true });
  } catch (error) {
    fail(res, error, "Failed to cancel redemption");
  }
});

/** Point prices, so the client never drifts from the server catalog. */
router.get("/point-catalog", (_req, res) => {
  res.json({ products: redeemableSkus() });
});

router.post("/kit-discount", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { cartItems } = req.body ?? {};
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ error: "cartItems is required" });
    }

    const result = await createKitDiscountCode(req.userId!, cartItems);
    res.json(result);
  } catch (error) {
    fail(res, error, "Failed to create kit discount code");
  }
});

// ---------------------------------------------------------------------------
// Product catalog
// ---------------------------------------------------------------------------

const PRODUCTS_QUERY = `
  query getProducts($first: Int!, $query: String!) {
    products(first: $first, query: $query) {
      edges {
        node {
          id
          handle
          title
          description
          tags
          priceRange { minVariantPrice { amount currencyCode } }
          images(first: 1) { edges { node { url altText } } }
          variants(first: 10) {
            edges {
              node {
                id
                title
                price { amount currencyCode }
                availableForSale
              }
            }
          }
        }
      }
    }
  }
`;

type CachedProducts = { at: number; products: unknown[] };
const productCache = new Map<string, CachedProducts>();
const PRODUCT_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Products for the shop and recommendations screens.
 * `?tag=` filters by Shopify tag (e.g. redeemable-with-points).
 *
 * Public on purpose — this is the same data the storefront serves — but cached
 * so it cannot be used to hammer the Shopify API.
 */
router.get("/products", async (req, res) => {
  const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
  const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
  const tagFilter = typeof req.query.tag === "string" ? req.query.tag.trim() : "";
  const handleParam = typeof req.query.handles === "string" ? req.query.handles.trim() : "";
  const cacheKey = handleParam ? `h:${handleParam}` : tagFilter || "__all__";

  const cached = productCache.get(cacheKey);
  if (cached && Date.now() - cached.at < PRODUCT_CACHE_TTL_MS) {
    res.set("x-products-cache", "hit");
    return res.json({ products: cached.products });
  }

  if (!STORE_DOMAIN || !STOREFRONT_TOKEN) {
    // Previously this fell back to a hardcoded list containing PLACEHOLDER_*
    // variant IDs, which produced checkouts that failed at the Shopify end with
    // no clear cause. Failing loudly is better than shipping fake inventory.
    console.error("[products] Shopify Storefront credentials are not configured");
    return res.status(503).json({ error: "Product catalog is temporarily unavailable" });
  }

  try {
    let products: any[];

    if (handleParam) {
      // Explicit handles — used when the caller already knows what it needs.
      products = await fetchProductsByHandles(handleParam.split(",").map((h) => h.trim()));
    } else if (tagFilter) {
      // Redeemable catalog.
      //
      // This used to be a `query: "tag:..."` listing, which returned nothing:
      // every product tagged redeemable-with-points on this store is UNLISTED,
      // and Shopify omits unlisted products from listing queries. The server's
      // own point catalog is the authority on what is redeemable anyway, so
      // resolve those handles directly and let the tag be advisory.
      products = await fetchProductsByHandles(redeemableSkus().map((p) => p.sku));
    } else {
      // General browse: the listing, plus any catalog products the listing
      // cannot see, so callers matching on handle always find them.
      const [listed, catalog] = await Promise.all([
        fetchProductListing(""),
        fetchProductsByHandles(redeemableSkus().map((p) => p.sku)),
      ]);
      const seen = new Set(listed.map((p: any) => p.handle));
      products = [...listed, ...catalog.filter((p: any) => !seen.has(p.handle))];
    }

    productCache.set(cacheKey, { at: Date.now(), products });
    res.set("x-products-cache", "miss");
    res.json({ products });
  } catch (error) {
    console.error("[products] failed to fetch from Shopify:", error);
    if (cached) {
      res.set("x-products-cache", "stale");
      return res.json({ products: cached.products });
    }
    res.status(502).json({ error: "Could not load products" });
  }
});

/** Plain listing query — only returns products Shopify shows in listings. */
async function fetchProductListing(tagFilter: string): Promise<any[]> {
  const domain = String(process.env.SHOPIFY_STORE_DOMAIN)
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  const response = await fetch(`https://${domain}/api/2024-07/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": String(process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN),
    },
    body: JSON.stringify({
      query: PRODUCTS_QUERY,
      variables: { first: 50, query: tagFilter ? `tag:${tagFilter}` : "" },
    }),
  });

  if (!response.ok) throw new Error(`Shopify responded ${response.status}`);

  const data: any = await response.json();
  if (data?.errors?.length) {
    throw new Error(data.errors.map((e: any) => e.message).join(", "));
  }
  return (data?.data?.products?.edges ?? []).map((edge: any) => edge.node);
}

export default router;
