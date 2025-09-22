// app/(app)/shop.tsx
import React, { useMemo } from "react";
import {
  View,
  Text,
  ImageBackground,
  Pressable,
  Image,
  StyleSheet,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

import { usePlanStore } from "@/state/planStore";
import { usePurchaseStore } from "@/state/purchaseStore";
import { useCartStore } from "@/state/cartStore";
import { useRewardsStore } from "@/state/rewardsStore";
import { ScreenScrollView } from "@/components/UI/bottom-space";

import {
  categorize,
  labelForSlot as libLabelForSlot,
  iconForSlot as libIconForSlot,
  ProductCategory,
} from "@/lib/products";

type Slot = Extract<ProductCategory, "cleanse" | "condition" | "treat" | "protect">;

/** Default placeholder images */
const DEFAULT_SLOT_IMAGES: Record<ProductCategory, any> = {
  cleanse: require("../../assets/kit/serum.png"),
  condition: require("../../assets/kit/serum.png"),
  treat: require("../../assets/kit/serum.png"),
  protect: require("../../assets/kit/serum.png"),
  scalp: require("../../assets/kit/serum.png"),
  style: require("../../assets/kit/serum.png"),
  oil: require("../../assets/kit/serum.png"),
  other: require("../../assets/kit/serum.png"),
};

/** Core products (always included) */
const CORE_PRODUCTS = {
  cleanse: {
    sku: "fleur-cleanser-generic",
    name: "Gentle Cleanser",
    priceCents: 1800,
    imageUrl: "https://example.com/cleanser.jpg",
    description: "Low-stripping wash that cleanses without over-drying; balances scalp on wash days.",
  },
  condition: {
    sku: "fleur-conditioner-generic", 
    name: "Lightweight Conditioner",
    priceCents: 1800,
    imageUrl: "https://example.com/conditioner.jpg",
    description: "Daily slip & softness that detangles and softens mid→ends without weighing roots down.",
  },
  treat: {
    sku: "fleur-serum",
    name: "Fleur Peptide Hair Serum",
    priceCents: 4800,
    imageUrl: "https://example.com/serum.jpg",
    description: "Daily follicle support with lightweight peptide blend for stronger, fuller-looking hair.",
  },
  protect: {
    sku: "fleur-derma-stamp",
    name: "Derma Stamp (Scalp Tool)",
    priceCents: 3000,
    imageUrl: "https://example.com/stamp.jpg",
    description: "Weekly micro-stimulation that targets scalp; complements serum absorption and growth goals.",
  },
};

/** Additional products for the "All Products" section */
const ADDITIONAL_PRODUCTS = [
  {
    sku: "fleur-bond-mask",
    name: "Bond Repair Mask",
    priceCents: 2800,
    imageUrl: "https://example.com/mask.jpg",
    category: "treat" as ProductCategory,
    description: "Weekly deep treatment that rebuilds broken bonds for stronger, more resilient hair.",
  },
  {
    sku: "fleur-heat-protectant",
    name: "Heat Protectant Spray",
    priceCents: 2200,
    imageUrl: "https://example.com/heat-protectant.jpg",
    category: "protect" as ProductCategory,
    description: "Essential protection for heat styling; shields hair from damage while maintaining style.",
  },
  {
    sku: "fleur-scalp-treatment",
    name: "Scalp Treatment Oil",
    priceCents: 3200,
    imageUrl: "https://example.com/scalp-treatment.jpg",
    category: "scalp" as ProductCategory,
    description: "Nourishing scalp treatment that soothes irritation and promotes healthy hair growth.",
  },
];

function GlassCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[styles.glassCard, style]}>
      {children}
    </View>
  );
}

function ProductImage({ uri, slot }: { uri?: string; slot: ProductCategory }) {
  const [failed, setFailed] = React.useState(false);
  const fallback = DEFAULT_SLOT_IMAGES[slot] ?? DEFAULT_SLOT_IMAGES.other;
  const source = !uri || failed ? fallback : { uri };

  return (
    <View style={styles.productImageContainer}>
      <Image
        source={source}
        onError={() => setFailed(true)}
        style={styles.productImage}
        resizeMode="cover"
      />
    </View>
  );
}

export default function Shop() {
  const { plan } = usePlanStore();
  const { purchases, hasPurchased, getPurchasedSkus } = usePurchaseStore();
  const { items: cartItems, addBySku, remove } = useCartStore();
  const { pointsTotal } = useRewardsStore();

  // Cart functionality
  const cartQty = useMemo(() => cartItems.reduce((sum, it) => sum + it.qty, 0), [cartItems]);
  const inCartSet = useMemo(() => new Set(cartItems.map((it) => it.sku)), [cartItems]);

  // Get recommended products from the plan
  const recommendedProducts = useMemo(() => {
    if (!plan?.recommendations) return [];
    
    const recommendedSkus = plan.recommendations
      .map(rec => rec?.product?.sku)
      .filter(Boolean) as string[];
    
    return Object.values(CORE_PRODUCTS).filter(product => 
      recommendedSkus.includes(product.sku)
    );
  }, [plan]);

  // Get purchased SKUs
  const purchasedSkus = getPurchasedSkus();

  // Filter out purchased products from additional products
  const availableAdditionalProducts = ADDITIONAL_PRODUCTS.filter(
    product => !hasPurchased(product.sku)
  );

  const toggleItemInCart = (sku: string) => {
    if (inCartSet.has(sku)) {
      remove(sku);
    } else {
      addBySku(sku, 1);
    }
  };

  const goToCart = () => router.push("/cart?returnTo=/shop");

  return (
    <View style={{ flex: 1, backgroundColor: "#120d0a" }}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <ImageBackground
        source={require("../../assets/dashboard.png")}
        resizeMode="cover"
        style={StyleSheet.absoluteFillObject}
      >
      </ImageBackground>

      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
          <View style={{ width: 38 }} />

          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "600" }}>Shop</Text>
            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 4 }}>Discover products for your hair journey</Text>
          </View>

          <Pressable onPress={goToCart} hitSlop={8} style={{ padding: 8, borderRadius: 20, position: "relative" }}>
            <Feather name="shopping-bag" size={22} color="#fff" />
            {cartQty > 0 && (
              <View
                style={{
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
                }}
              >
                <Text style={{ color: "#0b0b0b", fontSize: 11, fontWeight: "700" }}>{cartQty}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <ScreenScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 6,
          }}
          bottomExtra={16}
          showsVerticalScrollIndicator={false}
        >
          {/* Recommended Products */}
          {recommendedProducts.length > 0 && (
            <View style={{ gap: 16, marginBottom: 24 }}>
              {recommendedProducts.map((product) => {
                const isPurchased = hasPurchased(product.sku);
                const inCart = inCartSet.has(product.sku);
                const slot = categorize({ product: { sku: product.sku } }) as ProductCategory;
                
                return (
                  <GlassCard key={product.sku} style={{ padding: 20 }}>
                    {/* Header */}
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                      <View style={{ padding: 6, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", marginRight: 8 }}>
                        <Feather name={libIconForSlot(slot)} size={16} color="#fff" />
                      </View>
                      <Text style={{ color: "#fff", fontWeight: "600" }} numberOfLines={1} ellipsizeMode="tail">
                        {libLabelForSlot(slot)}
                      </Text>
                      {isPurchased && (
                        <View style={{ marginLeft: 8, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(34, 197, 94, 0.2)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 }}>
                          <Feather name="check-circle" size={12} color="#fff" />
                          <Text style={{ color: "#fff", fontSize: 12, marginLeft: 4 }}>Purchased</Text>
                        </View>
                      )}
                    </View>

                    {/* Image + body */}
                    <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
                      <ProductImage uri={product.imageUrl} slot={slot} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ color: "#fff", fontWeight: "500" }} numberOfLines={2} ellipsizeMode="tail">
                          {product.name}
                        </Text>
                        <Text style={{ color: "rgba(255,255,255,0.8)", marginTop: 4 }} numberOfLines={2} ellipsizeMode="tail">
                          {product.description || "Recommended for your hair type and routine"}
                        </Text>
                        <Text style={{ color: "rgba(255,255,255,0.6)", marginTop: 4, fontSize: 12 }} numberOfLines={1}>
                          ${(product.priceCents / 100).toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    {/* CTAs per item */}
                    <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
                      <Pressable
                        onPress={() => toggleItemInCart(product.sku)}
                        style={{
                          flex: 1,
                          borderRadius: 20,
                          alignItems: "center",
                          paddingVertical: 12,
                          backgroundColor: inCart ? "rgba(255,255,255,0.1)" : "#fff",
                          borderWidth: inCart ? 1 : 0,
                          borderColor: inCart ? "rgba(255,255,255,0.4)" : "transparent"
                        }}
                      >
                        <Text style={{ color: inCart ? "#fff" : "#120d0a", fontWeight: "600" }}>
                          {inCart ? "Remove from Routine" : "Add to Routine"}
                        </Text>
                      </Pressable>

                      {isPurchased && (
                        <Pressable
                          style={{ flex: 1, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.4)", backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", paddingVertical: 12 }}
                        >
                          <Text style={{ color: "#fff", fontWeight: "600" }}>
                            Already Owned
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </GlassCard>
                );
              })}
            </View>
          )}

          {/* All Products */}
          {availableAdditionalProducts.length > 0 && (
            <View style={{ gap: 16, marginBottom: 24 }}>
              {availableAdditionalProducts.map((product) => {
                const isPurchased = hasPurchased(product.sku);
                const inCart = inCartSet.has(product.sku);
                const slot = product.category;
                
                return (
                  <GlassCard key={product.sku} style={{ padding: 20 }}>
                    {/* Header */}
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                      <View style={{ padding: 6, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", marginRight: 8 }}>
                        <Feather name={libIconForSlot(slot)} size={16} color="#fff" />
                      </View>
                      <Text style={{ color: "#fff", fontWeight: "600" }} numberOfLines={1} ellipsizeMode="tail">
                        {libLabelForSlot(slot)}
                      </Text>
                      {isPurchased && (
                        <View style={{ marginLeft: 8, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(34, 197, 94, 0.2)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 }}>
                          <Feather name="check-circle" size={12} color="#fff" />
                          <Text style={{ color: "#fff", fontSize: 12, marginLeft: 4 }}>Purchased</Text>
                        </View>
                      )}
                    </View>

                    {/* Image + body */}
                    <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
                      <ProductImage uri={product.imageUrl} slot={slot} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ color: "#fff", fontWeight: "500" }} numberOfLines={2} ellipsizeMode="tail">
                          {product.name}
                        </Text>
                        <Text style={{ color: "rgba(255,255,255,0.8)", marginTop: 4 }} numberOfLines={2} ellipsizeMode="tail">
                          {product.description || "Additional product for your routine"}
                        </Text>
                        <Text style={{ color: "rgba(255,255,255,0.6)", marginTop: 4, fontSize: 12 }} numberOfLines={1}>
                          ${(product.priceCents / 100).toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    {/* CTAs per item */}
                    <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
                      <Pressable
                        onPress={() => toggleItemInCart(product.sku)}
                        style={{
                          flex: 1,
                          borderRadius: 20,
                          alignItems: "center",
                          paddingVertical: 12,
                          backgroundColor: inCart ? "rgba(255,255,255,0.1)" : "#fff",
                          borderWidth: inCart ? 1 : 0,
                          borderColor: inCart ? "rgba(255,255,255,0.4)" : "transparent"
                        }}
                      >
                        <Text style={{ color: inCart ? "#fff" : "#120d0a", fontWeight: "600" }}>
                          {inCart ? "Remove from Routine" : "Add to Routine"}
                        </Text>
                      </Pressable>

                      {isPurchased && (
                        <Pressable
                          style={{ flex: 1, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.4)", backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", paddingVertical: 12 }}
                        >
                          <Text style={{ color: "#fff", fontWeight: "600" }}>
                            Already Owned
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </GlassCard>
                );
              })}
            </View>
          )}

          {/* Empty State */}
          {recommendedProducts.length === 0 && availableAdditionalProducts.length === 0 && (
            <View style={{ alignItems: "center", paddingVertical: 48 }}>
              <Feather name="shopping-bag" size={48} color="rgba(255,255,255,0.3)" />
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "600", marginTop: 16 }}>All Products Purchased</Text>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 8, textAlign: "center" }}>
                You've purchased all available products! Check back later for new additions.
              </Text>
            </View>
          )}

          {/* Bottom CTA */}
          <View style={{ gap: 12 }}>
            <Pressable
              onPress={cartQty > 0 ? goToCart : undefined}
              disabled={cartQty === 0}
              style={{
                borderRadius: 20,
                backgroundColor: cartQty > 0 ? "#fff" : "rgba(255,255,255,0.1)",
                borderWidth: cartQty > 0 ? 0 : 1,
                borderColor: cartQty > 0 ? "transparent" : "rgba(255,255,255,0.3)",
                alignItems: "center",
                paddingVertical: 16,
                opacity: cartQty > 0 ? 1 : 0.6,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ 
                  color: cartQty > 0 ? "#120d0a" : "rgba(255,255,255,0.7)", 
                  fontWeight: "600" 
                }}>
                  {cartQty > 0 ? `Go to Checkout (${cartQty})` : "Go to Checkout"}
                </Text>
                {cartQty > 0 && (
                  <Feather name="arrow-right" size={18} color="#0b0b0b" style={{ marginLeft: 10 }} />
                )}
              </View>
            </Pressable>

          </View>
        </ScreenScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    position: "relative",
    paddingTop: 32,
  },
  headerTitle: { 
    color: "#fff", 
    fontSize: 22, 
    fontWeight: "800", 
    textAlign: "center" 
  },
  headerSub: { 
    color: "rgba(255,255,255,0.85)", 
    fontSize: 12, 
    marginTop: 4, 
    textAlign: "center" 
  },
  cartButton: {
    position: "absolute",
    right: 0,
    top: 8,
    padding: 8,
    borderRadius: 20,
  },
  cartBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadgeText: {
    color: "#0b0b0b",
    fontSize: 11,
    fontWeight: "700",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionHeaderText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  sectionSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    marginTop: 4,
  },
  iconDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    marginRight: 8,
  },
  glassCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  productsContainer: {
    marginTop: 16,
    gap: 12,
  },
  productCard: {
    padding: 20,
  },
  productHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  slotIcon: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginRight: 8,
  },
  slotLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  productImageContainer: {
    width: 80,
    height: 80,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  productInfo: {
    flex: 1,
    gap: 4,
  },
  productName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  productPrice: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "500",
  },
  productDescription: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginTop: 4,
  },
  purchasedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: 8,
  },
  purchasedText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
  productActions: {
    // No specific styling needed
  },
  ctaButton: {
    flex: 1,
    borderRadius: 25,
    alignItems: "center",
    paddingVertical: 12,
  },
  ctaButtonAdd: {
    backgroundColor: "#fff",
  },
  ctaButtonInCart: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  ctaButtonTextAdd: {
    color: "#0b0b0b",
  },
  ctaButtonTextInCart: {
    color: "#fff",
  },
  bottomCta: {
    marginTop: 24,
    gap: 12,
  },
  checkoutButton: {
    borderRadius: 25,
    backgroundColor: "#fff",
    alignItems: "center",
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
  },
  checkoutButtonText: {
    color: "#0b0b0b",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 16,
  },
  emptyStateTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  emptyStateSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
