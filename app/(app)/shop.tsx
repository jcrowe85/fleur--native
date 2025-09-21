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
    name: "Fleur Cleanser",
    priceCents: 1800,
    imageUrl: "https://example.com/cleanser.jpg",
  },
  condition: {
    sku: "fleur-conditioner-generic", 
    name: "Fleur Conditioner",
    priceCents: 1800,
    imageUrl: "https://example.com/conditioner.jpg",
  },
  treat: {
    sku: "fleur-serum",
    name: "Fleur Peptide Hair Serum",
    priceCents: 4800,
    imageUrl: "https://example.com/serum.jpg",
  },
  protect: {
    sku: "fleur-derma-stamp",
    name: "Fleur Derma Stamp",
    priceCents: 3000,
    imageUrl: "https://example.com/stamp.jpg",
  },
};

/** Additional products for the "All Products" section */
const ADDITIONAL_PRODUCTS = [
  {
    sku: "fleur-bond-mask",
    name: "Fleur Bond Repair Mask",
    priceCents: 2800,
    imageUrl: "https://example.com/mask.jpg",
    category: "treat" as ProductCategory,
  },
  {
    sku: "fleur-heat-protectant",
    name: "Fleur Heat Protectant",
    priceCents: 2200,
    imageUrl: "https://example.com/heat-protectant.jpg",
    category: "protect" as ProductCategory,
  },
  {
    sku: "fleur-scalp-treatment",
    name: "Fleur Scalp Treatment",
    priceCents: 3200,
    imageUrl: "https://example.com/scalp-treatment.jpg",
    category: "scalp" as ProductCategory,
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
      <ImageBackground
        source={require("../../assets/dashboard.png")}
        resizeMode="cover"
        style={StyleSheet.absoluteFillObject as any}
      />
      <StatusBar style="light" />
      
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <ScreenScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 0 }}
          bottomExtra={16}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerWrap}>
            <Text style={styles.headerTitle}>Shop</Text>
            <Pressable onPress={goToCart} hitSlop={8} style={styles.cartButton}>
              <Feather name="shopping-bag" size={22} color="#fff" />
              {cartQty > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartQty}</Text>
                </View>
              )}
            </Pressable>
            <Text style={styles.headerSub}>Discover products for your hair journey</Text>
          </View>
        {/* Recommended Products Section */}
        {recommendedProducts.length > 0 && (
          <GlassCard style={{ padding: 14, marginBottom: 14 }}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.iconDot}>
                  <Feather name="star" size={14} color="#fff" />
                </View>
                <Text style={styles.sectionHeaderText}>Your Recommended Products</Text>
              </View>
            </View>
            <Text style={styles.sectionSubtitle}>Based on your hair analysis</Text>
            
            <View style={styles.productsContainer}>
              {recommendedProducts.map((product) => {
                const isPurchased = hasPurchased(product.sku);
                const inCart = inCartSet.has(product.sku);
                const slot = categorize({ product: { sku: product.sku } }) as ProductCategory;
                
                return (
                  <GlassCard key={product.sku} style={styles.productCard}>
                    {/* Header */}
                    <View style={styles.productHeader}>
                      <View style={styles.slotIcon}>
                        <Feather name={libIconForSlot(slot)} size={16} color="#fff" />
                      </View>
                      <Text style={styles.slotLabel}>{libLabelForSlot(slot)}</Text>
                      {isPurchased && (
                        <View style={styles.purchasedBadge}>
                          <Feather name="check-circle" size={12} color="#fff" />
                          <Text style={styles.purchasedText}>Purchased</Text>
                        </View>
                      )}
                    </View>

                    {/* Image + body */}
                    <View style={styles.productRow}>
                      <ProductImage 
                        uri={product.imageUrl} 
                        slot={slot}
                      />
                      <View style={styles.productInfo}>
                        <Text style={styles.productName}>{product.name}</Text>
                        <Text style={styles.productPrice}>
                          ${(product.priceCents / 100).toFixed(2)}
                        </Text>
                        <Text style={styles.productDescription}>
                          Recommended for your hair type and routine
                        </Text>
                      </View>
                    </View>

                    {/* CTA */}
                    <View style={styles.productActions}>
                      <Pressable
                        onPress={() => toggleItemInCart(product.sku)}
                        style={[
                          styles.ctaButton,
                          inCart ? styles.ctaButtonInCart : styles.ctaButtonAdd
                        ]}
                      >
                        <Text style={[
                          styles.ctaButtonText,
                          inCart ? styles.ctaButtonTextInCart : styles.ctaButtonTextAdd
                        ]}>
                          {inCart ? "Remove from Bag" : "Add to Bag"}
                        </Text>
                      </Pressable>
                    </View>
                  </GlassCard>
                );
              })}
            </View>
          </GlassCard>
        )}

        {/* All Products Section */}
        {availableAdditionalProducts.length > 0 && (
          <GlassCard style={{ padding: 14, marginBottom: 14 }}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.iconDot}>
                  <Feather name="shopping-bag" size={14} color="#fff" />
                </View>
                <Text style={styles.sectionHeaderText}>Explore More Products</Text>
              </View>
            </View>
            <Text style={styles.sectionSubtitle}>Additional products for your routine</Text>
            
            <View style={styles.productsContainer}>
              {availableAdditionalProducts.map((product) => {
                const inCart = inCartSet.has(product.sku);
                const slot = product.category;
                
                return (
                  <GlassCard key={product.sku} style={styles.productCard}>
                    {/* Header */}
                    <View style={styles.productHeader}>
                      <View style={styles.slotIcon}>
                        <Feather name={libIconForSlot(slot)} size={16} color="#fff" />
                      </View>
                      <Text style={styles.slotLabel}>{libLabelForSlot(slot)}</Text>
                    </View>

                    {/* Image + body */}
                    <View style={styles.productRow}>
                      <ProductImage 
                        uri={product.imageUrl} 
                        slot={slot}
                      />
                      <View style={styles.productInfo}>
                        <Text style={styles.productName}>{product.name}</Text>
                        <Text style={styles.productPrice}>
                          ${(product.priceCents / 100).toFixed(2)}
                        </Text>
                        <Text style={styles.productDescription}>
                          Additional product for your routine
                        </Text>
                      </View>
                    </View>

                    {/* CTA */}
                    <View style={styles.productActions}>
                      <Pressable
                        onPress={() => toggleItemInCart(product.sku)}
                        style={[
                          styles.ctaButton,
                          inCart ? styles.ctaButtonInCart : styles.ctaButtonAdd
                        ]}
                      >
                        <Text style={[
                          styles.ctaButtonText,
                          inCart ? styles.ctaButtonTextInCart : styles.ctaButtonTextAdd
                        ]}>
                          {inCart ? "Remove from Bag" : "Add to Bag"}
                        </Text>
                      </Pressable>
                    </View>
                  </GlassCard>
                );
              })}
            </View>
          </GlassCard>
        )}

        {/* Empty State */}
        {recommendedProducts.length === 0 && availableAdditionalProducts.length === 0 && (
          <View style={styles.emptyState}>
            <Feather name="shopping-bag" size={48} color="rgba(255,255,255,0.3)" />
            <Text style={styles.emptyStateTitle}>All Products Purchased</Text>
            <Text style={styles.emptyStateSubtitle}>
              You've purchased all available products! Check back later for new additions.
            </Text>
          </View>
        )}

        {/* Bottom CTA - Cart Navigation */}
        {cartQty > 0 && (
          <View style={styles.bottomCta}>
            <Pressable onPress={goToCart} style={styles.checkoutButton}>
              <Text style={styles.checkoutButtonText}>Go to Bag ({cartQty})</Text>
              <Feather name="arrow-right" size={18} color="#0b0b0b" style={{ marginLeft: 10 }} />
            </Pressable>
          </View>
        )}
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
