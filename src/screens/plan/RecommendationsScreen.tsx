// app/recommendations.tsx
import React, { useMemo, useState, useEffect } from "react";
import { View, Text, Image, ImageBackground, ScrollView, Pressable, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

import { usePlanStore } from "@/state/planStore";
import type { FleurPlan } from "@/types/plan";
import { fetchAllProducts, ShopifyProduct } from "@/services/shopifyClient";
import { useCartStore } from "@/state/cartStore";

/** Product slot mapping for recommendations */
type Slot = "cleanse" | "condition" | "treat" | "protect";

/** Map LLM handles to actual Shopify product handles */
// No longer needed - LLM now returns original SKUs directly
// function mapLlmHandleToShopifyHandle(llmHandle: string): string {
//   return llmHandle; // LLM now returns original SKUs like "fleur-1", "fleur-shampoo", etc.
// }

/** Map Shopify products to slots based on their handles */
function getProductSlot(productHandle: string): Slot {
  const slotMapping: Record<string, Slot> = {
    "shampoo": "cleanse",
    "conditioner": "condition", 
    "bloom": "treat",
    "micro-roller": "protect",
    "hair-mask": "treat",
    "heat-shield": "protect",
    "detangling-comb": "protect",
    "vegan-biotin": "treat",
    "vitamin-d3": "treat", 
    "iron": "treat",
    "silk-pillow": "protect",
    // Legacy mappings (keep for backward compatibility)
    "fleur-shampoo": "cleanse",
    "fleur-conditioner": "condition", 
    "fleur-1": "treat",
    "fleur-derma-stamp": "protect",
    "fleur-hair-mask": "treat",
    "fleur-heat-shield": "protect",
    "fleur-detangling-comb": "protect",
    "fleur-biotin": "treat",
    "fleur-vitamin-d3": "treat", 
    "fleur-iron": "treat",
    "fleur-silk-pillowcase": "protect",
  };
  
  return slotMapping[productHandle] || "treat";
}

/** Get slot icon */
function getSlotIcon(slot: Slot): any {
  const icons: Record<Slot, any> = {
    cleanse: "droplet",
    condition: "wind",
    treat: "activity", 
    protect: "shield",
  };
  return icons[slot];
}

/** Get slot label */
function getSlotLabel(slot: Slot): string {
  const labels: Record<Slot, string> = {
    cleanse: "Cleanse",
    condition: "Condition",
    treat: "Treat",
    protect: "Protect",
  };
  return labels[slot];
}

/** Get usage badges for a product */
function getUsageBadges(productHandle: string, slot: Slot): string[] {
  const badges: Record<string, string[]> = {
    "fleur-shampoo": ["Wash days"],
    "fleur-conditioner": ["2×/wk"],
    "bloom": ["Daily PM", "Dry/clean scalp"],
    "fleur-derma-stamp": ["1–2×/wk", "Patch test"],
    "fleur-repair-mask": ["1×/wk", "7-10 min"],
    "fleur-heat-shield": ["Before heat"],
    "fleur-silk-pillowcase": ["Every night"],
    "detangling-comb": ["Daily use"],
    "fleur-biotin": ["Daily"],
    "fleur-vitamin-d3": ["Daily"],
    "fleur-iron": ["Daily"],
    "fleur-complete-kit": ["Full routine"],
  };
  
  return badges[productHandle] || ["As needed"];
}

/** Small pill badge */
function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

/** Product image component with loading states */
function ProductImage({ uri, title }: { uri?: string; title: string }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  
  // Reset states when URI changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    setRetryAttempt(0);
  }, [uri]);

  // Retry mechanism - keep trying every 2 seconds until it loads
  useEffect(() => {
    if (!uri || imageLoaded) return;
    
    const retryInterval = setInterval(() => {
      setRetryAttempt(prev => {
        console.log(`Retrying image load for ${title}: ${uri}, attempt ${prev + 1}`);
        return prev + 1;
      });
    }, 2000);

    return () => clearInterval(retryInterval);
  }, [uri, imageLoaded, title]);

  // Don't render anything if no valid URI
  if (!uri || uri === "null") {
    return (
      <View style={styles.imagePlaceholder}>
        <Feather name="image" size={24} color="rgba(255,255,255,0.3)" />
      </View>
    );
  }

  const handleImageLoad = () => {
    console.log(`✅ Image loaded successfully: ${title} - ${uri}`);
    setImageLoaded(true);
  };

  const handleImageError = () => {
    console.log(`❌ Image load failed: ${title} - ${uri}, retry count: ${retryAttempt}`);
    // Don't set error state - just keep retrying
  };

  return (
    <View style={styles.imageContainer}>
      {/* Always show loading spinner until image is loaded */}
      {!imageLoaded && (
        <View style={styles.imageLoadingContainer}>
          <Feather name="loader" size={20} color="rgba(255,255,255,0.5)" />
        </View>
      )}

      {/* Image - always render if we have a URI */}
      <Image
        source={{ uri }}
        onLoad={handleImageLoad}
        onError={handleImageError}
        style={[styles.productImage, { opacity: imageLoaded ? 1 : 0 }]}
        resizeMode="cover"
        key={`${uri}-${retryAttempt}`}
      />
    </View>
  );
}

export default function Recommendations() {
  const insets = useSafeAreaInsets();
  const plan = usePlanStore((s) => s.plan);
  const [shopifyProducts, setShopifyProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch Shopify products on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Fetch all products instead of just redeemable ones to include supplements
        const products = await fetchAllProducts();
        setShopifyProducts(products);
      } catch (error) {
        console.error('Failed to fetch Shopify products:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, []);

  // Build kit from LLM recommendations + Shopify products
  const kit = useMemo(() => {
    if (!shopifyProducts.length || !plan?.recommendations) return [];
    
    // Create a map for easy lookup
    const productMap = new Map<string, ShopifyProduct>();
    shopifyProducts.forEach(product => {
      productMap.set(product.handle, product);
    });

    const kitItems = [];
    
    // Use LLM's direct product handle selections (now using original SKUs)
    for (const recommendation of plan.recommendations) {
      // LLM now returns original SKUs directly, no mapping needed
      const product = productMap.get(recommendation.handle);
      if (product) {
        const slot = getProductSlot(recommendation.handle);
        kitItems.push({
          product,
          slot,
          title: getSlotLabel(slot),
          why: recommendation.why,
          howToUse: recommendation.howToUse,
        });
      } else {
        console.warn(`Product not found for LLM handle "${recommendation.handle}"`);
      }
    }

    // If we don't have enough LLM-selected products, fill with core products
    if (kitItems.length < 8) { // Updated to 8 to include supplements for hormonal users
      const usedHandles = new Set(kitItems.map(item => item.product.handle));
      const coreProducts = [
        { handle: "bloom", slot: "treat" as Slot },
        { handle: "micro-roller", slot: "protect" as Slot },
        { handle: "shampoo", slot: "cleanse" as Slot },
        { handle: "conditioner", slot: "condition" as Slot },
      ];
      
      for (const { handle, slot } of coreProducts) {
        if (!usedHandles.has(handle)) {
          const product = productMap.get(handle);
          if (product) {
            kitItems.push({
              product,
              slot,
              title: getSlotLabel(slot),
              why: `Essential for your ${slot} routine`,
            });
          } else {
            console.warn(`Core product not found: LLM handle "${handle}" -> Shopify handle "${shopifyHandle}"`);
          }
        }
        if (kitItems.length >= 8) break; // Updated to 8 to include supplements for hormonal users
      }
    }

    return kitItems.slice(0, 8); // Updated to 8 to include supplements for hormonal users
  }, [shopifyProducts, plan?.recommendations]);

  // Cart store
  const { items: cartItems, addBySku, remove } = useCartStore();

  // For the "Owned" toggle only (local)
  const [alreadyHave, setAlreadyHave] = useState<Set<string>>(new Set());
  const toggleHave = (handle: string) => {
    setAlreadyHave((prev) => {
      const next = new Set(prev);
      next.has(handle) ? next.delete(handle) : next.add(handle);
      return next;
    });
  };

  const cartQty = useMemo(() => cartItems.reduce((sum, it) => sum + it.qty, 0), [cartItems]);
  const inCartSet = useMemo(() => new Set(cartItems.map((it) => it.sku)), [cartItems]);

  // Add whole kit to cart
  const addKitToBag = () => {
    const handles = kit.map((k) => k.product.handle).filter(Boolean);
    if (handles.length === 0) return;
    
    // Add each product to cart using addBySku (like ShopScreen does)
    handles.forEach(handle => {
      addBySku(handle, 1);
    });
    
    router.push("/cart?returnTo=/(plan)/recommendations");
  };

  // Per-item add/remove
  const toggleItemInBag = (handle: string) => {
    if (inCartSet.has(handle)) {
      remove(handle);
    } else {
      addBySku(handle, 1);
    }
  };

  const goCart = () => router.push("/cart?returnTo=/(plan)/recommendations");
  const goDashboard = () => router.replace("/dashboard");

  // Get product image URL
  const getProductImageUrl = (product: ShopifyProduct): string | undefined => {
    return product.images?.edges?.[0]?.node?.url;
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <ImageBackground
        source={require("../../../assets/dashboard.png")}
        resizeMode="cover"
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Your Kit</Text>
            <Text style={styles.headerSubtitle}>Matched to your Routine</Text>
          </View>

          <Pressable onPress={goCart} style={styles.cartButton} hitSlop={8}>
            <Feather name="shopping-bag" size={22} color="#fff" />
            {cartQty > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartQty}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 28 }]}
        >
          {/* Loading state */}
          {loading && (
            <View style={styles.loadingContainer}>
              <Feather name="loader" size={24} color="rgba(255,255,255,0.5)" />
              <Text style={styles.loadingText}>Loading your kit...</Text>
            </View>
          )}

          {/* Kit cards */}
          {!loading && kit.length > 0 && (
            <View style={styles.kitContainer}>
              {kit.map((item) => {
                const have = alreadyHave.has(item.product.handle);
                const inCart = inCartSet.has(item.product.handle);
                const headerBadges = getUsageBadges(item.product.handle, item.slot);
                const imageUrl = getProductImageUrl(item.product);

                return (
                  <View key={item.product.handle} style={styles.productCard}>
                    {/* Header with slot icon and badges */}
                    <View style={styles.cardHeader}>
                      <View style={styles.slotIcon}>
                        <Feather name={getSlotIcon(item.slot)} size={16} color="#fff" />
                      </View>
                      <Text style={styles.slotLabel} numberOfLines={1} ellipsizeMode="tail">
                        {getSlotLabel(item.slot)}
                      </Text>
                      <View style={styles.badgesContainer}>
                        {headerBadges.map((badge) => (
                          <Badge key={badge} label={badge} />
                        ))}
                      </View>
                    </View>

                    {/* Image + body */}
                    <Pressable
                      onPress={() => router.push({
                        pathname: "/(app)/shop/product-detail",
                        params: { productId: item.product.handle, returnTo: "/(plan)/recommendations" }
                      })}
                      style={styles.productContent}
                    >
                      <ProductImage uri={imageUrl} title={item.product.title} />
                      <View style={styles.productInfo}>
                        <Text style={styles.productName} numberOfLines={2} ellipsizeMode="tail">
                          {item.product.title}
                        </Text>
                        <Text style={styles.productDescription} numberOfLines={2} ellipsizeMode="tail">
                          {item.why || item.product.description}
                        </Text>
                        {item.howToUse && (
                          <Text style={styles.howToUse} numberOfLines={1} ellipsizeMode="tail">
                            💡 {item.howToUse}
                          </Text>
                        )}
                      </View>
                    </Pressable>

                    {/* CTAs per item */}
                    <View style={styles.ctaContainer}>
                      <Pressable
                        onPress={() => toggleItemInBag(item.product.handle)}
                        style={[styles.ctaButton, inCart ? styles.ctaButtonInCart : styles.ctaButtonPrimary]}
                      >
                        <Text style={[styles.ctaButtonText, inCart ? styles.ctaButtonTextInCart : styles.ctaButtonTextPrimary]}>
                          {inCart ? "Remove from Bag" : "Add to Bag"}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => toggleHave(item.product.handle)}
                        style={styles.ctaButtonSecondary}
                      >
                        <Text style={styles.ctaButtonTextSecondary}>
                          {have ? "Marked as Owned" : "Already have"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Bottom CTA stack */}
          {!loading && (
            <View style={styles.bottomCTAs}>
              {cartQty > 0 ? (
                <>
                  <Pressable onPress={goCart} style={styles.primaryButton}>
                    <View style={styles.buttonContent}>
                      <Text style={styles.primaryButtonText}>Go to Bag</Text>
                      <Feather name="arrow-right" size={18} color="#0b0b0b" style={{ marginLeft: 10 }} />
                    </View>
                  </Pressable>

                  <Pressable onPress={addKitToBag} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>Add Kit — 20% off</Text>
                  </Pressable>

                  <Pressable onPress={goDashboard} style={styles.linkButton}>
                    <Text style={styles.linkButtonText}>Continue without kit</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable onPress={goDashboard} style={styles.primaryButton}>
                    <View style={styles.buttonContent}>
                      <Text style={styles.primaryButtonText}>Continue to Dashboard</Text>
                      <Feather name="arrow-right" size={18} color="#0b0b0b" style={{ marginLeft: 10 }} />
                    </View>
                  </Pressable>

                  <Pressable onPress={addKitToBag} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>Add Kit — 20% off</Text>
                  </Pressable>

                  <Pressable onPress={goCart} style={styles.linkButton}>
                    <Text style={styles.linkButtonText}>Review bag (0)</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/** ----------------------------------------------------------------
 * Styles
 * ---------------------------------------------------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0D0D",
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginTop: 4,
  },
  cartButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    position: "relative",
  },
  cartBadge: {
    position: "absolute",
    right: 2,
    top: 2,
    backgroundColor: "#fff",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadgeText: {
    color: "#0b0b0b",
    fontSize: 11,
    fontWeight: "700",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    marginTop: 8,
  },
  kitContainer: {
    gap: 16,
    marginBottom: 24,
  },
  productCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 20,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  slotIcon: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginRight: 8,
  },
  slotLabel: {
    color: "#fff",
    fontWeight: "600",
    flex: 1,
  },
  badgesContainer: {
    flexDirection: "row",
    flexShrink: 1,
    minWidth: 0,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    marginLeft: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  productContent: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  imageContainer: {
    width: 80,
    height: 80,
    position: "relative",
  },
  imageLoadingContainer: {
    position: "absolute",
    width: 80,
    height: 80,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    position: "absolute",
    top: 0,
    left: 0,
  },
  productInfo: {
    flex: 1,
    minWidth: 0,
  },
  productName: {
    color: "#fff",
    fontWeight: "500",
  },
  productDescription: {
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  howToUse: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginTop: 4,
    fontStyle: "italic",
  },
  ctaContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  ctaButton: {
    flex: 1,
    borderRadius: 25,
    alignItems: "center",
    paddingVertical: 12,
  },
  ctaButtonPrimary: {
    backgroundColor: "#fff",
  },
  ctaButtonInCart: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  ctaButtonSecondary: {
    flex: 1,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    paddingVertical: 12,
  },
  ctaButtonText: {
    fontWeight: "600",
  },
  ctaButtonTextPrimary: {
    color: "#0b0b0b",
  },
  ctaButtonTextInCart: {
    color: "#fff",
  },
  ctaButtonTextSecondary: {
    color: "#fff",
    fontWeight: "600",
  },
  bottomCTAs: {
    gap: 12,
    marginTop: 16,
  },
  primaryButton: {
    borderRadius: 25,
    backgroundColor: "#fff",
    alignItems: "center",
    paddingVertical: 16,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#0b0b0b",
    fontWeight: "600",
  },
  secondaryButton: {
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    paddingVertical: 16,
  },
  secondaryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  linkButton: {
    alignItems: "center",
    marginTop: 4,
  },
  linkButtonText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    textDecorationLine: "underline",
  },
});
