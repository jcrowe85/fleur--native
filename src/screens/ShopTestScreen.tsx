// src/screens/ShopTestScreen.tsx
import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  ImageBackground,
  Pressable,
  Image,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Linking, Alert } from "react-native";
import { WebView } from "react-native-webview";

import { usePlanStore } from "@/state/planStore";
import { usePurchaseStore } from "@/state/purchaseStore";
import { useCartStore } from "@/state/cartStore";
import { useRewardsStore } from "@/state/rewardsStore";
import { useAuthStore } from "@/state/authStore";
import { ScreenScrollView } from "@/components/UI/bottom-space";

// Import Shopify types and functions
import { 
  ShopifyProduct, 
  fetchRedeemableProducts, 
  fetchAllProducts,
  createPointDiscountCode,
  calculatePointRedemption,
  createSeamlessCheckoutWithDiscount,
  PointRedemption
} from "@/services/shopifyClient";

// Import product point catalog
import { getProductPointValue, canAffordProduct, getProductInfo } from "@/data/productPointCatalog";

/** Default placeholder images */
const DEFAULT_PRODUCT_IMAGE = require("../../assets/kit/serum.png");

function GlassCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[styles.glassCard, style]}>
      {children}
    </View>
  );
}

function ProductImage({ uri, title }: { uri?: string; title: string }) {
  const [failed, setFailed] = useState(false);
  const source = !uri || failed ? DEFAULT_PRODUCT_IMAGE : { uri };

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


export default function ShopTestScreen() {
  const { plan } = usePlanStore();
  const { purchases, hasPurchased, getPurchasedSkus } = usePurchaseStore();
  const { items: cartItems, addBySku, remove } = useCartStore();
  const { pointsTotal } = useRewardsStore();
  const { user, session } = useAuthStore();

  // Shopify products state
  const [shopifyProducts, setShopifyProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Point redemption state
  const [redeemingPoints, setRedeemingPoints] = useState(false);
  const [activeRedemption, setActiveRedemption] = useState<PointRedemption | null>(null);
  
  // Refresh state
  const [refreshing, setRefreshing] = useState(false);
  
  // Checkout sheet state
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  // Cart functionality
  const cartQty = useMemo(() => cartItems.reduce((sum, it) => sum + it.qty, 0), [cartItems]);
  const inCartSet = useMemo(() => new Set(cartItems.map((it) => it.sku)), [cartItems]);

  // Load products function
  const loadProducts = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      // Try to fetch redeemable products first, fallback to all products
      let products: ShopifyProduct[];
      try {
        products = await fetchRedeemableProducts();
        console.log("Loaded redeemable products:", products.length);
      } catch (redeemableError) {
        console.warn("Failed to fetch redeemable products, trying all products:", redeemableError);
        products = await fetchAllProducts();
        console.log("Loaded all products:", products.length);
      }
      setShopifyProducts(products);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load products";
      setError(errorMessage);
      console.error("Error loading Shopify products:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch Shopify products on mount
  useEffect(() => {
    loadProducts();
  }, []);

  // Refresh function
  const handleRefresh = () => {
    loadProducts(true);
  };

  const toggleItemInCart = (sku: string) => {
    if (inCartSet.has(sku)) {
      remove(sku);
    } else {
      addBySku(sku, 1);
    }
  };

  const goToCart = () => router.push("/cart?returnTo=/shop");

  // Point redemption functions
  const handleRedeemPoints = async (product: ShopifyProduct) => {
    try {
      setRedeemingPoints(true);
      
      // Use the same matching logic as the UI
      const productSku = product.handle || 
                       product.title.toLowerCase().replace(/\s+/g, '-') ||
                       product.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      let pointsRequired = getProductPointValue(productSku);
      let finalSku = productSku;
      
      // If no exact match, try to find by title keywords
      if (pointsRequired === 0) {
        const title = product.title.toLowerCase();
        if (title.includes('serum')) {
          pointsRequired = 480;
          finalSku = 'bloom';
        } else if (title.includes('shampoo')) {
          pointsRequired = 360;
          finalSku = 'fleur-shampoo';
        } else if (title.includes('conditioner')) {
          pointsRequired = 380;
          finalSku = 'fleur-conditioner';
        } else if (title.includes('mask') || title.includes('repair')) {
          pointsRequired = 550;
          finalSku = 'fleur-repair-mask';
        } else if (title.includes('heat') || title.includes('shield')) {
          pointsRequired = 200;
          finalSku = 'fleur-heat-shield';
        } else if (title.includes('comb')) {
          pointsRequired = 250;
          finalSku = 'detangling-comb';
        } else if (title.includes('pillowcase') || title.includes('silk')) {
          pointsRequired = 300;
          finalSku = 'fleur-silk-pillowcase';
        } else if (title.includes('biotin')) {
          pointsRequired = 150;
          finalSku = 'fleur-biotin';
        } else if (title.includes('vitamin d') || title.includes('d3')) {
          pointsRequired = 150;
          finalSku = 'fleur-vitamin-d3';
        } else if (title.includes('iron')) {
          pointsRequired = 150;
          finalSku = 'fleur-iron';
        } else if (title.includes('kit') || title.includes('complete')) {
          pointsRequired = 1200;
          finalSku = 'fleur-complete-kit';
        }
      }
      
      if (pointsRequired === 0) {
        Alert.alert("Product Not Found", "This product is not available for point redemption.");
        return;
      }
      
      if (pointsTotal < pointsRequired) {
        Alert.alert("Insufficient Points", `You need ${pointsRequired} points to redeem this product. You have ${pointsTotal} points.`);
        return;
      }
      
      // Get user ID from Supabase auth
      if (!user?.id) {
        Alert.alert("Authentication Error", "Please sign in to redeem points.");
        return;
      }

      // Create seamless checkout with discount pre-applied
      const checkoutResult = await createSeamlessCheckoutWithDiscount(finalSku, user.id, pointsTotal);
      
      // Set the checkout URL to open in the native checkout sheet
      setCheckoutUrl(checkoutResult.checkoutUrl);
      
      // Set active redemption for tracking
      setActiveRedemption({
        productSku: finalSku,
        pointsUsed: pointsRequired,
        discountAmount: checkoutResult.discountAmount,
        checkoutUrl: checkoutResult.checkoutUrl
      });
      
    } catch (error) {
      console.error("Error creating discount code:", error);
      Alert.alert("Error", "Failed to create discount code. Please try again.");
    } finally {
      setRedeemingPoints(false);
    }
  };

  const formatPrice = (amount: string, currencyCode: string) => {
    const price = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(price);
  };

  const getProductImage = (product: ShopifyProduct) => {
    return product.images.edges[0]?.node.url;
  };

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
        <View style={styles.headerWrap}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 }}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              style={{ padding: 8, borderRadius: 20 }}
            >
              <Feather name="arrow-left" size={18} color="#fff" />
            </Pressable>

            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={styles.headerTitle}>Shop Test (Shopify)</Text>
              <Text style={styles.headerSub}>Testing Shopify API integration</Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {/* Refresh Button */}
              <Pressable
                onPress={handleRefresh}
                disabled={refreshing || loading}
                hitSlop={8}
                style={{ 
                  padding: 8, 
                  borderRadius: 20,
                  backgroundColor: refreshing ? "rgba(255,255,255,0.1)" : "transparent",
                  opacity: (refreshing || loading) ? 0.6 : 1
                }}
              >
                <Feather 
                  name="refresh-cw" 
                  size={20} 
                  color="#fff" 
                  style={{ 
                    transform: [{ rotate: refreshing ? '180deg' : '0deg' }] 
                  }}
                />
              </Pressable>

              {/* Cart Button */}
              <View style={{ padding: 10, borderRadius: 20, position: "relative" }}>
                <Pressable onPress={goToCart} hitSlop={8}>
                  <Feather name="shopping-bag" size={24} color="#fff" />
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
            </View>
          </View>
        </View>

        <ScreenScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 6,
          }}
          bottomExtra={16}
          showsVerticalScrollIndicator={false}
        >
          {/* Loading State */}
          {loading && (
            <View style={{ alignItems: "center", paddingVertical: 48 }}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={{ color: "#fff", marginTop: 16 }}>Loading products from Shopify...</Text>
            </View>
          )}

          {/* Error State */}
          {error && (
            <View style={{ alignItems: "center", paddingVertical: 48 }}>
              <Feather name="alert-circle" size={48} color="rgba(255,255,255,0.3)" />
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "600", marginTop: 16, textAlign: "center" }}>
                Error Loading Products
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 8, textAlign: "center" }}>
                {error}
              </Text>
              <Pressable
                onPress={handleRefresh}
                style={{
                  marginTop: 16,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  backgroundColor: "rgba(255,255,255,0.1)",
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.3)",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>Retry</Text>
              </Pressable>
            </View>
          )}

          {/* Shopify Products */}
          {!loading && !error && shopifyProducts.length > 0 && (() => {
            // Separate products into redeemable and non-redeemable
            const redeemableProducts: ShopifyProduct[] = [];
            const nonRedeemableProducts: ShopifyProduct[] = [];
            
            shopifyProducts.forEach((product) => {
              const productSku = product.handle || 
                               product.title.toLowerCase().replace(/\s+/g, '-') ||
                               product.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
              
              let pointsRequired = getProductPointValue(productSku);
              
              // If no exact match, try to find by title keywords
              if (pointsRequired === 0) {
                const title = product.title.toLowerCase();
                if (title.includes('serum')) {
                  pointsRequired = 480;
                } else if (title.includes('shampoo')) {
                  pointsRequired = 360;
                } else if (title.includes('conditioner')) {
                  pointsRequired = 380;
                } else if (title.includes('mask') || title.includes('repair')) {
                  pointsRequired = 550;
                } else if (title.includes('heat') || title.includes('shield')) {
                  pointsRequired = 200;
                } else if (title.includes('comb')) {
                  pointsRequired = 250;
                } else if (title.includes('pillowcase') || title.includes('silk')) {
                  pointsRequired = 300;
                } else if (title.includes('biotin')) {
                  pointsRequired = 150;
                } else if (title.includes('vitamin d') || title.includes('d3')) {
                  pointsRequired = 150;
                } else if (title.includes('iron')) {
                  pointsRequired = 150;
                } else if (title.includes('kit') || title.includes('complete')) {
                  pointsRequired = 1200;
                }
              }
              
              if (pointsRequired > 0) {
                redeemableProducts.push(product);
              } else {
                nonRedeemableProducts.push(product);
              }
            });
            
            return (
              <View style={{ gap: 24, marginBottom: 24 }}>
                {/* Redeemable Products Section */}
                {redeemableProducts.length > 0 && (
                  <View style={{ gap: 16 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                      <View style={{ 
                        width: 24, 
                        height: 24, 
                        borderRadius: 12, 
                        backgroundColor: "rgba(34, 197, 94, 0.2)", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        marginRight: 12 
                      }}>
                        <Text style={{ color: "#22c55e", fontSize: 14 }}>💎</Text>
                      </View>
                      <Text style={{ color: "#fff", fontSize: 18, fontWeight: "600" }}>
                        Redeemable with Points ({redeemableProducts.length})
                      </Text>
                    </View>
                    
                    {redeemableProducts.map((product) => {
                      const productSku = product.handle; // Use handle as SKU for now
                      const isPurchased = hasPurchased(productSku);
                      const inCart = inCartSet.has(productSku);
                      const imageUrl = getProductImage(product);
                      const price = formatPrice(
                        product.priceRange.minVariantPrice.amount,
                        product.priceRange.minVariantPrice.currencyCode
                      );
                      
                      // Get points required for this product
                      const productSkuForPoints = product.handle || 
                                               product.title.toLowerCase().replace(/\s+/g, '-') ||
                                               product.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
                      
                      let pointsRequired = getProductPointValue(productSkuForPoints);
                      
                      // If no exact match, try to find by title keywords
                      if (pointsRequired === 0) {
                        const title = product.title.toLowerCase();
                        if (title.includes('serum')) {
                          pointsRequired = 480;
                        } else if (title.includes('shampoo')) {
                          pointsRequired = 360;
                        } else if (title.includes('conditioner')) {
                          pointsRequired = 380;
                        } else if (title.includes('mask') || title.includes('repair')) {
                          pointsRequired = 550;
                        } else if (title.includes('heat') || title.includes('shield')) {
                          pointsRequired = 200;
                        } else if (title.includes('comb')) {
                          pointsRequired = 250;
                        } else if (title.includes('pillowcase') || title.includes('silk')) {
                          pointsRequired = 300;
                        } else if (title.includes('biotin')) {
                          pointsRequired = 150;
                        } else if (title.includes('vitamin d') || title.includes('d3')) {
                          pointsRequired = 150;
                        } else if (title.includes('iron')) {
                          pointsRequired = 150;
                        } else if (title.includes('kit') || title.includes('complete')) {
                          pointsRequired = 1200;
                        }
                      }
                      
                      const canAfford = pointsTotal >= pointsRequired;
                      
                      return (
                        <GlassCard key={product.id} style={{ padding: 20 }}>
                          {/* Header */}
                          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                            <View style={{ padding: 6, borderRadius: 20, backgroundColor: "rgba(34, 197, 94, 0.2)", marginRight: 8 }}>
                              <Feather name="gift" size={16} color="#22c55e" />
                            </View>
                            <Text style={{ color: "#fff", fontWeight: "600" }} numberOfLines={1} ellipsizeMode="tail">
                              {pointsRequired} Points
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
                            <ProductImage uri={imageUrl} title={product.title} />
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={{ color: "#fff", fontWeight: "500" }} numberOfLines={2} ellipsizeMode="tail">
                                {product.title}
                              </Text>
                              <Text style={{ color: "rgba(255,255,255,0.8)", marginTop: 4 }} numberOfLines={2} ellipsizeMode="tail">
                                {product.description || "Product from Shopify"}
                              </Text>
                              <Text style={{ color: "rgba(255,255,255,0.6)", marginTop: 4, fontSize: 12 }} numberOfLines={1}>
                                {price} • {pointsRequired} points (${(pointsRequired * 0.10).toFixed(2)})
                              </Text>
                            </View>
                          </View>

                          {/* Point Status */}
                          <View style={{ 
                            marginTop: 12, 
                            padding: 12, 
                            backgroundColor: canAfford ? "rgba(34, 197, 94, 0.1)" : "rgba(255, 193, 7, 0.1)", 
                            borderRadius: 12, 
                            borderWidth: 1, 
                            borderColor: canAfford ? "rgba(34, 197, 94, 0.3)" : "rgba(255, 193, 7, 0.3)"
                          }}>
            <Text style={{ 
              color: canAfford ? "#22c55e" : "#ffc107", 
              fontSize: 12, 
              fontWeight: "600",
              textAlign: "center"
            }}>
              {canAfford 
                ? `✅ You can get this FREE with ${pointsRequired} points!` 
                : `⚠️ Need ${pointsRequired - pointsTotal} more points to redeem`
              }
            </Text>
                          </View>

                          {/* CTAs */}
                          <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
                            <Pressable
                              onPress={() => toggleItemInCart(productSku)}
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
                                {inCart ? "Remove from Cart" : "Add to Cart"}
                              </Text>
                            </Pressable>

                            {!isPurchased && (
                              <Pressable
                                onPress={() => handleRedeemPoints(product)}
                                disabled={redeemingPoints || !canAfford}
                                style={{
                                  flex: 1,
                                  borderRadius: 20,
                                  alignItems: "center",
                                  paddingVertical: 12,
                                  backgroundColor: redeemingPoints ? "rgba(34, 197, 94, 0.3)" : "rgba(34, 197, 94, 0.2)",
                                  borderWidth: 1,
                                  borderColor: "rgba(34, 197, 94, 0.4)",
                                  opacity: (redeemingPoints || !canAfford) ? 0.6 : 1
                                }}
                              >
                <Text style={{ color: "#22c55e", fontWeight: "600", fontSize: 12 }}>
                  {redeemingPoints ? "Creating..." : canAfford ? "Redeem & Checkout" : "Need More Points"}
                </Text>
                              </Pressable>
                            )}

                            {isPurchased && (
                              <Pressable
                                style={{ 
                                  flex: 1, 
                                  borderRadius: 20, 
                                  borderWidth: 1, 
                                  borderColor: "rgba(255,255,255,0.4)", 
                                  backgroundColor: "rgba(255,255,255,0.1)", 
                                  alignItems: "center", 
                                  paddingVertical: 12 
                                }}
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

                {/* Non-Redeemable Products Section */}
                {nonRedeemableProducts.length > 0 && (
                  <View style={{ gap: 16 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                      <View style={{ 
                        width: 24, 
                        height: 24, 
                        borderRadius: 12, 
                        backgroundColor: "rgba(255,255,255,0.1)", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        marginRight: 12 
                      }}>
                        <Feather name="shopping-bag" size={14} color="#fff" />
                      </View>
                      <Text style={{ color: "#fff", fontSize: 18, fontWeight: "600" }}>
                        Regular Products ({nonRedeemableProducts.length})
                      </Text>
                    </View>
                    
                    {nonRedeemableProducts.map((product) => {
                      const productSku = product.handle;
                      const isPurchased = hasPurchased(productSku);
                      const inCart = inCartSet.has(productSku);
                      const imageUrl = getProductImage(product);
                      const price = formatPrice(
                        product.priceRange.minVariantPrice.amount,
                        product.priceRange.minVariantPrice.currencyCode
                      );
                      
                      return (
                        <GlassCard key={product.id} style={{ padding: 20 }}>
                          {/* Header */}
                          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                            <View style={{ padding: 6, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", marginRight: 8 }}>
                              <Feather name="package" size={16} color="#fff" />
                            </View>
                            <Text style={{ color: "#fff", fontWeight: "600" }} numberOfLines={1} ellipsizeMode="tail">
                              {product.productType || "Product"}
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
                            <ProductImage uri={imageUrl} title={product.title} />
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={{ color: "#fff", fontWeight: "500" }} numberOfLines={2} ellipsizeMode="tail">
                                {product.title}
                              </Text>
                              <Text style={{ color: "rgba(255,255,255,0.8)", marginTop: 4 }} numberOfLines={2} ellipsizeMode="tail">
                                {product.description || "Product from Shopify"}
                              </Text>
                              <Text style={{ color: "rgba(255,255,255,0.6)", marginTop: 4, fontSize: 12 }} numberOfLines={1}>
                                {price}
                              </Text>
                              {product.tags.length > 0 && (
                                <Text style={{ color: "rgba(255,255,255,0.5)", marginTop: 2, fontSize: 10 }}>
                                  Tags: {product.tags.slice(0, 3).join(", ")}
                                </Text>
                              )}
                            </View>
                          </View>

                          {/* CTAs */}
                          <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
                            <Pressable
                              onPress={() => toggleItemInCart(productSku)}
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
                                {inCart ? "Remove from Cart" : "Add to Cart"}
                              </Text>
                            </Pressable>

                            {isPurchased && (
                              <Pressable
                                style={{ 
                                  flex: 1, 
                                  borderRadius: 20, 
                                  borderWidth: 1, 
                                  borderColor: "rgba(255,255,255,0.4)", 
                                  backgroundColor: "rgba(255,255,255,0.1)", 
                                  alignItems: "center", 
                                  paddingVertical: 12 
                                }}
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
              </View>
            );
          })()}

          {/* Empty State */}
          {!loading && !error && shopifyProducts.length === 0 && (
            <View style={{ alignItems: "center", paddingVertical: 48 }}>
              <Feather name="shopping-bag" size={48} color="rgba(255,255,255,0.3)" />
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "600", marginTop: 16 }}>No Products Found</Text>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 8, textAlign: "center" }}>
                No products with the "redeemable-with-points" tag were found in your Shopify store.
              </Text>
            </View>
          )}

          {/* Debug Info */}
          {!loading && !error && (
            <GlassCard style={{ padding: 16, marginTop: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ color: "#fff", fontWeight: "600" }}>Debug Info</Text>
                <Pressable
                  onPress={handleRefresh}
                  disabled={refreshing || loading}
                  style={{ 
                    padding: 4, 
                    borderRadius: 12,
                    backgroundColor: refreshing ? "rgba(255,255,255,0.1)" : "transparent",
                    opacity: (refreshing || loading) ? 0.6 : 1
                  }}
                >
                  <Feather 
                    name="refresh-cw" 
                    size={14} 
                    color="#fff" 
                    style={{ 
                      transform: [{ rotate: refreshing ? '180deg' : '0deg' }] 
                    }}
                  />
                </Pressable>
              </View>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
                • Products loaded: {shopifyProducts.length}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
                • Cart items: {cartQty}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
                • Points available: {pointsTotal} (${(pointsTotal * 0.10).toFixed(2)} value)
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
                • User ID: {user?.id ? `${user.id.slice(0, 8)}...` : "Not authenticated"}
              </Text>
              {refreshing && (
                <Text style={{ color: "#22c55e", fontSize: 12, marginTop: 4 }}>
                  • Refreshing products...
                </Text>
              )}
              {activeRedemption && (
                <>
                  <Text style={{ color: "#22c55e", fontSize: 12, marginTop: 4 }}>
                    • Active discount: {activeRedemption.discountCode}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
                    • Points used: {activeRedemption.pointsUsed}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
                    • Discount amount: ${activeRedemption.discountAmount.toFixed(2)}
                  </Text>
                </>
              )}
            </GlassCard>
          )}

          {/* Bottom CTA */}
          <View style={{ gap: 12, marginTop: 16 }}>
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
        
        {/* Checkout Sheet */}
        <CheckoutSheet
          visible={!!checkoutUrl}
          url={checkoutUrl ?? undefined}
          onClose={() => setCheckoutUrl(null)}
          onComplete={(finalUrl) => {
            setCheckoutUrl(null);
            if (activeRedemption) {
              Alert.alert("Success!", `You've redeemed ${activeRedemption.pointsUsed} points for this product!`);
              setActiveRedemption(null);
            }
          }}
        />
      </SafeAreaView>
    </View>
  );
}

// Checkout Sheet Component (copied from CartScreen)
type CheckoutSheetProps = {
  visible: boolean;
  url?: string;
  onClose: () => void;
  onComplete?: (finalUrl: string) => void;
};

function CheckoutSheet({ visible, url, onClose, onComplete }: CheckoutSheetProps) {
  if (!visible || !url) return null;

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
        <View style={{ 
          flex: 1, 
          marginTop: 100, 
          backgroundColor: "#fff", 
          borderTopLeftRadius: 20, 
          borderTopRightRadius: 20,
          overflow: "hidden"
        }}>
          {/* Header */}
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: "#f0f0f0"
          }}>
            <Text style={{ fontSize: 18, fontWeight: "600", color: "#000" }}>
              Complete Purchase
            </Text>
            <Pressable onPress={onClose} style={{ padding: 8 }}>
              <Feather name="x" size={24} color="#666" />
            </Pressable>
          </View>
          
          {/* WebView */}
          <WebView
            source={{ uri: url }}
            style={{ flex: 1 }}
            onNavigationStateChange={(navState) => {
              // Check if checkout is complete (you can customize this logic)
              if (navState.url.includes("thank-you") || navState.url.includes("success")) {
                onComplete?.(navState.url);
              }
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
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
  glassCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
    backgroundColor: "rgba(255,255,255,0.08)",
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
});
