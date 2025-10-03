import express from "express";
import { createDiscountCode, createCheckoutWithDiscount, createKitDiscountCode } from "./shopify.service";

const router = express.Router();

// Create discount code endpoint
router.post("/discount-code", async (req, res) => {
  try {
    const { code, amount, userId, productSku } = req.body;
    
    if (!code || !amount || !userId || !productSku) {
      return res.status(400).json({ 
        error: "Missing required fields: code, amount, userId, productSku" 
      });
    }

    const result = await createDiscountCode(code, amount, userId, productSku);
    res.json(result);
  } catch (error) {
    console.error("Error creating discount code:", error);
    res.status(500).json({ 
      error: "Failed to create discount code",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Create kit discount code endpoint
router.post("/kit-discount", async (req, res) => {
  try {
    const { userId, cartItems } = req.body;
    
    if (!userId || !cartItems) {
      return res.status(400).json({ 
        error: "Missing required fields: userId, cartItems" 
      });
    }

    const result = await createKitDiscountCode(userId, cartItems);
    res.json(result);
  } catch (error) {
    console.error("Error creating kit discount code:", error);
    res.status(500).json({ 
      error: "Failed to create kit discount code",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Create checkout with discount endpoint
router.post("/checkout", async (req, res) => {
  try {
    const { productSku, userId, userPoints } = req.body;
    
    if (!productSku || !userId || !userPoints) {
      return res.status(400).json({ 
        error: "Missing required fields: productSku, userId, userPoints" 
      });
    }

    const result = await createCheckoutWithDiscount(productSku, userId, userPoints);
    res.json(result);
  } catch (error) {
    console.error("Error creating checkout:", error);
    res.status(500).json({ 
      error: "Failed to create checkout",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get products endpoint - fetches from Shopify Storefront API
router.get("/products", async (req, res) => {
  try {
    const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
    const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
    
    // Try to fetch from real Shopify API first
    if (STORE_DOMAIN && STOREFRONT_TOKEN) {
      try {
        console.log("Fetching products from real Shopify API...");
        const domain = STORE_DOMAIN.replace(/^https?:\/\//, "").replace(/\/$/, "");
        const url = `https://${domain}/api/2023-10/graphql.json`;
        
        const query = `
          query getProducts($first: Int!, $query: String!) {
            products(first: $first, query: $query) {
              edges {
                node {
                  id
                  handle
                  title
                  description
                  tags
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
                      }
                    }
                  }
                }
              }
            }
          }
        `;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
          },
          body: JSON.stringify({
            query,
            variables: {
              first: 50,
              query: 'tag:redeemable-with-points'
            }
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.products) {
            const products = data.data.products.edges.map((edge: any) => edge.node);
            console.log(`Successfully fetched ${products.length} products from Shopify`);
            return res.json({ products });
          }
        }
        
        console.warn("Shopify API call failed, falling back to hardcoded products");
      } catch (error) {
        console.warn("Error calling Shopify API:", error);
      }
    }
    
    if (!STORE_DOMAIN || !STOREFRONT_TOKEN) {
      console.warn("Missing Shopify credentials, returning fallback products");
      // Fallback to hardcoded list if credentials missing
      const fallbackProducts = [
        { 
          handle: "bloom", 
          title: "Hair Growth Serum", 
          description: "Peptide-based serum for density and shedding",
          priceRange: { minVariantPrice: { amount: "48.00", currencyCode: "USD" } },
          images: { edges: [{ node: { url: "https://via.placeholder.com/300x300/4A5568/FFFFFF?text=Bloom+Serum" } }] },
          variants: { edges: [{ node: { id: "gid://shopify/ProductVariant/44826097221811", title: "Default Title", price: { amount: "48.00", currencyCode: "USD" }, availableForSale: true } }] }
        },
        { 
          handle: "fleur-derma-stamp", 
          title: "Derma Stamp", 
          description: "Micro-needling tool for scalp stimulation",
          priceRange: { minVariantPrice: { amount: "30.00", currencyCode: "USD" } },
          images: { edges: [{ node: { url: "https://via.placeholder.com/300x300/4A5568/FFFFFF?text=Derma+Stamp" } }] },
          variants: { edges: [{ node: { id: "gid://shopify/ProductVariant/44138710597811", title: "Default Title", price: { amount: "30.00", currencyCode: "USD" }, availableForSale: true } }] }
        },
        { 
          handle: "fleur-shampoo", 
          title: "Gentle Shampoo", 
          description: "Low-stripping cleanser",
          priceRange: { minVariantPrice: { amount: "18.00", currencyCode: "USD" } },
          images: { edges: [{ node: { url: "https://via.placeholder.com/300x300/4A5568/FFFFFF?text=Gentle+Shampoo" } }] },
          variants: { edges: [] }
        },
        { 
          handle: "fleur-conditioner", 
          title: "Lightweight Conditioner", 
          description: "Detangling, mid-to-ends",
          priceRange: { minVariantPrice: { amount: "18.00", currencyCode: "USD" } },
          images: { edges: [{ node: { url: "https://via.placeholder.com/300x300/4A5568/FFFFFF?text=Conditioner" } }] },
          variants: { edges: [] }
        },
        { 
          handle: "fleur-repair-mask", 
          title: "Bond Repair Mask", 
          description: "Weekly treatment for damage",
          priceRange: { minVariantPrice: { amount: "28.00", currencyCode: "USD" } },
          images: { edges: [{ node: { url: "https://via.placeholder.com/300x300/4A5568/FFFFFF?text=Repair+Mask" } }] },
          variants: { edges: [{ node: { id: "gid://shopify/ProductVariant/PLACEHOLDER_MASK", title: "Default Title", price: { amount: "28.00", currencyCode: "USD" }, availableForSale: true } }] }
        },
        { 
          handle: "fleur-heat-shield", 
          title: "Heat Shield Spray", 
          description: "Heat protection",
          priceRange: { minVariantPrice: { amount: "22.00", currencyCode: "USD" } },
          images: { edges: [{ node: { url: "https://via.placeholder.com/300x300/4A5568/FFFFFF?text=Heat+Shield" } }] },
          variants: { edges: [{ node: { id: "gid://shopify/ProductVariant/PLACEHOLDER_HEAT_SHIELD", title: "Default Title", price: { amount: "22.00", currencyCode: "USD" }, availableForSale: true } }] }
        },
        { 
          handle: "fleur-silk-pillowcase", 
          title: "Silk Pillowcase", 
          description: "Friction reduction",
          priceRange: { minVariantPrice: { amount: "35.00", currencyCode: "USD" } },
          images: { edges: [{ node: { url: "https://via.placeholder.com/300x300/4A5568/FFFFFF?text=Silk+Pillowcase" } }] },
          variants: { edges: [{ node: { id: "gid://shopify/ProductVariant/PLACEHOLDER_PILLOWCASE", title: "Default Title", price: { amount: "35.00", currencyCode: "USD" }, availableForSale: true } }] }
        },
        { 
          handle: "detangling-comb", 
          title: "Detangling Comb", 
          description: "Gentle detangling",
          priceRange: { minVariantPrice: { amount: "15.00", currencyCode: "USD" } },
          images: { edges: [{ node: { url: "https://via.placeholder.com/300x300/4A5568/FFFFFF?text=Detangling+Comb" } }] },
          variants: { edges: [{ node: { id: "gid://shopify/ProductVariant/PLACEHOLDER_COMB", title: "Default Title", price: { amount: "15.00", currencyCode: "USD" }, availableForSale: true } }] }
        },
        { 
          handle: "fleur-biotin", 
          title: "Biotin Supplement", 
          description: "Hair growth support",
          priceRange: { minVariantPrice: { amount: "25.00", currencyCode: "USD" } },
          images: { edges: [{ node: { url: "https://via.placeholder.com/300x300/4A5568/FFFFFF?text=Biotin" } }] },
          variants: { edges: [{ node: { id: "gid://shopify/ProductVariant/PLACEHOLDER_BIOTIN", title: "Default Title", price: { amount: "25.00", currencyCode: "USD" }, availableForSale: true } }] }
        },
        { 
          handle: "fleur-vitamin-d3", 
          title: "Vitamin D3 Supplement", 
          description: "Hair health",
          priceRange: { minVariantPrice: { amount: "20.00", currencyCode: "USD" } },
          images: { edges: [{ node: { url: "https://via.placeholder.com/300x300/4A5568/FFFFFF?text=Vitamin+D3" } }] },
          variants: { edges: [{ node: { id: "gid://shopify/ProductVariant/PLACEHOLDER_VITAMIN_D3", title: "Default Title", price: { amount: "20.00", currencyCode: "USD" }, availableForSale: true } }] }
        },
        { 
          handle: "fleur-iron", 
          title: "Iron Supplement", 
          description: "Hair growth support",
          priceRange: { minVariantPrice: { amount: "18.00", currencyCode: "USD" } },
          images: { edges: [{ node: { url: "https://via.placeholder.com/300x300/4A5568/FFFFFF?text=Iron" } }] },
          variants: { edges: [{ node: { id: "gid://shopify/ProductVariant/PLACEHOLDER_IRON", title: "Default Title", price: { amount: "18.00", currencyCode: "USD" }, availableForSale: true } }] }
        },
        { 
          handle: "fleur-complete-kit", 
          title: "Complete Hair Kit", 
          description: "Full routine bundle",
          priceRange: { minVariantPrice: { amount: "120.00", currencyCode: "USD" } },
          images: { edges: [{ node: { url: "https://via.placeholder.com/300x300/4A5568/FFFFFF?text=Complete+Kit" } }] },
          variants: { edges: [{ node: { id: "gid://shopify/ProductVariant/PLACEHOLDER_KIT", title: "Default Title", price: { amount: "120.00", currencyCode: "USD" }, availableForSale: true } }] }
        },
      ];
      return res.json({ products: fallbackProducts });
    }

    // Fetch from Shopify Storefront API
    const query = `
      query getProducts {
        products(first: 50, query: "tag:redeemable-with-points") {
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
            }
          }
        }
      }
    `;

    const response = await fetch(`https://${STORE_DOMAIN}/api/2023-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const data = await response.json();
    const products = data.data?.products?.edges?.map((edge: any) => ({
      id: edge.node.id,
      title: edge.node.title,
      handle: edge.node.handle,
      description: edge.node.description,
      priceRange: edge.node.priceRange,
      images: edge.node.images,
      tags: edge.node.tags,
    })) || [];

    console.log(`✅ Fetched ${products.length} products from Shopify`);
    res.json({ products });
  } catch (error) {
    console.error("Error fetching products from Shopify:", error);
    res.status(500).json({ 
      error: "Failed to fetch products from Shopify",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
