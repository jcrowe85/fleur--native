// src/screens/ShopScreen.tsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ImageBackground,
  Pressable,
  Image,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Animated,
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

/** Generic product placeholder */
const GENERIC_PRODUCT_PLACEHOLDER = {
  uri: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz4KPHN2ZyB4PSI1MCIgeT0iNTAiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4zKSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPgo8cGF0aCBkPSJtMjEgMTYtMy0zIDMtM0ExIDEgMCAwIDAgMTggOWwtMyAzLTMtM0ExIDEgMCAwIDAgMTAgOWwtMyAzIDMgM0ExIDEgMCAwIDAgMTIgMTVsMy0zIDMgM0ExIDEgMCAwIDAgMjEgMTZaIi8+Cjwvc3ZnPgo8L3N2Zz4K"
};

function GlassCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[styles.glassCard, style]}>
      {children}
    </View>
  );
}

function ProductImage({ uri, title }: { uri?: string; title: string }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const spinValue = useRef(new Animated.Value(0)).current;
  
  // Don't render anything if no valid URI
  if (!uri || uri === "null") {
    return (
      <View style={[styles.productImageContainer, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
        <Feather name="image" size={24} color="rgba(255,255,255,0.3)" />
      </View>
    );
  }

  // Start spinning animation when component mounts
  useEffect(() => {
    if (!imageLoaded && !imageError) {
      const spin = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      spin.start();
      
      return () => spin.stop();
    }
  }, [imageLoaded, imageError, spinValue]);

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    console.log(`Failed to load product image: ${title} - ${uri}`);
    setImageError(true);
  };

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.productImageContainer}>
      {!imageLoaded && !imageError && (
        <View style={[styles.productImage, { position: "absolute", backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" }]}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Feather name="loader" size={20} color="rgba(255,255,255,0.5)" />
          </Animated.View>
        </View>
      )}
      {imageError ? (
        <View style={[styles.productImage, { backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" }]}>
          <Feather name="image" size={24} color="rgba(255,255,255,0.3)" />
        </View>
      ) : (
        <Image
          source={{ uri }}
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={[styles.productImage, { opacity: imageLoaded ? 1 : 0 }]}
          resizeMode="cover"
        />
      )}
    </View>
  );
}


export default function ShopScreen() {
  const { plan } = usePlanStore();
  const { purchases, hasPurchased, getPurchasedSkus } = usePurchaseStore();
  const { items: cartItems, add, addBySku, remove } = useCartStore();
  const { pointsTotal, earn } = useRewardsStore();
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

  const toggleItemInCart = (product: ShopifyProduct) => {
    const productSku = product.handle || 
                     product.title.toLowerCase().replace(/\s+/g, '-') ||
                     product.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    if (inCartSet.has(productSku)) {
      remove(productSku);
    } else {
      // Add with actual Shopify product data
      add({
        sku: productSku,
        name: product.title,
        priceCents: Math.round(parseFloat(product.priceRange.minVariantPrice.amount) * 100),
        imageUrl: product.images?.edges?.[0]?.node?.url || undefined,
        variantId: product.variants?.edges?.[0]?.node?.id || undefined
      });
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
          pointsRequired = 850;
          finalSku = 'bloom';
        } else if (title.includes('shampoo')) {
          pointsRequired = 750;
          finalSku = 'fleur-shampoo';
        } else if (title.includes('conditioner')) {
          pointsRequired = 780;
          finalSku = 'fleur-conditioner';
        } else if (title.includes('mask') || title.includes('repair')) {
          pointsRequired = 900;
          finalSku = 'fleur-repair-mask';
        } else if (title.includes('heat') || title.includes('shield')) {
          pointsRequired = 700;
          finalSku = 'fleur-heat-shield';
        } else if (title.includes('comb')) {
          pointsRequired = 250;
          finalSku = 'detangling-comb';
        } else if (title.includes('pillowcase') || title.includes('silk')) {
          pointsRequired = 650;
          finalSku = 'fleur-silk-pillowcase';
        } else if (title.includes('derma') || title.includes('stamp')) {
          pointsRequired = 725;
          finalSku = 'fleur-derma-stamp';
        } else if (title.includes('biotin')) {
          pointsRequired = 500;
          finalSku = 'fleur-biotin';
        } else if (title.includes('vitamin d') || title.includes('d3')) {
          pointsRequired = 500;
          finalSku = 'fleur-vitamin-d3';
        } else if (title.includes('iron')) {
          pointsRequired = 500;
          finalSku = 'fleur-iron';
        } else if (title.includes('kit') || title.includes('complete')) {
          pointsRequired = 3500;
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
        pointsUsed: pointsRequired,
        discountAmount: checkoutResult.discountAmount,
        discountCode: "",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
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
    // Try to find the first valid image URL
    const images = product.images?.edges || [];
    let imageUrl = null;
    
    for (const edge of images) {
      if (edge?.node?.url) {
        imageUrl = edge.node.url;
        break;
      }
    }
    
    console.log(`Product: ${product.title}`);
    console.log(`Total images: ${images.length}`);
    console.log(`Selected image URL: ${imageUrl}`);
    
    return imageUrl;
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
              <Text style={styles.headerTitle}>Shop</Text>
              <Text style={styles.headerSub}>Redeem your points for products</Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
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
            // Separate products into affordable and need more points
            const affordableProducts: ShopifyProduct[] = [];
            const needMorePointsProducts: ShopifyProduct[] = [];
            
            shopifyProducts.forEach((product) => {
              const productSku = product.handle || 
                               product.title.toLowerCase().replace(/\s+/g, '-') ||
                               product.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
              
              let pointsRequired = getProductPointValue(productSku);
              
              // If no exact match, try to find by title keywords
              if (pointsRequired === 0) {
                const title = product.title.toLowerCase();
                if (title.includes('serum')) {
                  pointsRequired = 850;
                } else if (title.includes('shampoo')) {
                  pointsRequired = 750;
                } else if (title.includes('conditioner')) {
                  pointsRequired = 780;
                } else if (title.includes('mask') || title.includes('repair')) {
                  pointsRequired = 900;
                } else if (title.includes('heat') || title.includes('shield')) {
                  pointsRequired = 700;
                } else if (title.includes('comb')) {
                  pointsRequired = 250;
                } else if (title.includes('pillowcase') || title.includes('silk')) {
                  pointsRequired = 650;
                } else if (title.includes('derma') || title.includes('stamp')) {
                  pointsRequired = 725;
                } else if (title.includes('biotin')) {
                  pointsRequired = 500;
                } else if (title.includes('vitamin d') || title.includes('d3')) {
                  pointsRequired = 500;
                } else if (title.includes('iron')) {
                  pointsRequired = 500;
                } else if (title.includes('kit') || title.includes('complete')) {
                  pointsRequired = 3500;
                }
              }
              
              // Check if user can afford this product
              const canAfford = pointsTotal >= pointsRequired;
              
              if (pointsRequired > 0) {
                if (canAfford) {
                  affordableProducts.push(product);
                } else {
                  needMorePointsProducts.push(product);
                }
              }
            });
            
            return (
              <View style={{ gap: 24, marginBottom: 24 }}>
                {/* Affordable Products Section */}
                {affordableProducts.length > 0 && (
                  <View style={{ gap: 16 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                      <View style={{ 
                        width: 24, 
                        height: 24, 
                        borderRadius: 12, 
                        backgroundColor: "rgba(255, 255, 255, 0.1)", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        marginRight: 12 
                      }}>
                        <Feather name="check-circle" size={14} color="#fff" />
                      </View>
                      <Text style={{ color: "#fff", fontSize: 18, fontWeight: "600" }}>
                        Available to Redeem ({affordableProducts.length})
                      </Text>
                    </View>
                    
                    {affordableProducts.map((product) => {
                      const productSku = product.handle; // Use handle as SKU for now
                      const isPurchased = hasPurchased(productSku);
                      const inCart = inCartSet.has(productSku);
                      const imageUrl = getProductImage(product) || undefined;
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
                          pointsRequired = 850;
                        } else if (title.includes('shampoo')) {
                          pointsRequired = 750;
                        } else if (title.includes('conditioner')) {
                          pointsRequired = 780;
                        } else if (title.includes('mask') || title.includes('repair')) {
                          pointsRequired = 900;
                        } else if (title.includes('heat') || title.includes('shield')) {
                          pointsRequired = 700;
                        } else if (title.includes('comb')) {
                          pointsRequired = 250;
                        } else if (title.includes('pillowcase') || title.includes('silk')) {
                          pointsRequired = 650;
                        } else if (title.includes('derma') || title.includes('stamp')) {
                          pointsRequired = 725;
                        } else if (title.includes('biotin')) {
                          pointsRequired = 500;
                        } else if (title.includes('vitamin d') || title.includes('d3')) {
                          pointsRequired = 500;
                        } else if (title.includes('iron')) {
                          pointsRequired = 500;
                        } else if (title.includes('kit') || title.includes('complete')) {
                          pointsRequired = 3500;
                        }
                      }
                      
                      const canAfford = pointsTotal >= pointsRequired;
                      
                      return (
                        <GlassCard key={product.id} style={{ padding: 20 }}>
                          {/* Header */}
                          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                            <View style={{ padding: 6, borderRadius: 20, backgroundColor: "rgba(255, 255, 255, 0.1)", marginRight: 8 }}>
                              <Feather name="gift" size={16} color="#fff" />
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
                          <Pressable
                            onPress={() => router.push({
                              pathname: "/shop/product-detail",
                              params: { productId: product.id }
                            })}
                            style={{ flexDirection: "row", gap: 16, alignItems: "center" }}
                          >
                            <ProductImage uri={imageUrl} title={product.title} />
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={{ color: "#fff", fontWeight: "500" }} numberOfLines={2} ellipsizeMode="tail">
                                {product.title}
                              </Text>
                              <Text style={{ color: "rgba(255,255,255,0.8)", marginTop: 4 }} numberOfLines={2} ellipsizeMode="tail">
                                {product.description || "Product from Shopify"}
                              </Text>
                              <Text style={{ color: "rgba(255,255,255,0.6)", marginTop: 4, fontSize: 12 }} numberOfLines={1}>
                                {price} • {pointsRequired} points
                              </Text>
                            </View>
                          </Pressable>

                          {/* Point Status */}
                          <View style={{ 
                            marginTop: 12, 
                            padding: 8, 
                            backgroundColor: "rgba(255, 255, 255, 0.05)", 
                            borderRadius: 8, 
                            borderWidth: 1, 
                            borderColor: "rgba(255, 255, 255, 0.1)",
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center"
                          }}>
                            <Feather name="check-circle" size={14} color="#fff" />
                            <Text style={{ 
                              color: "#fff", 
                              fontSize: 11, 
                              fontWeight: "500",
                              marginLeft: 6
                            }}>
                              You can get this FREE with {pointsRequired} points!
                            </Text>
                          </View>

                          {/* CTAs */}
                          {canAfford ? (
                            // When user can afford - show side by side buttons
                            <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
                              <Pressable
                                onPress={() => toggleItemInCart(product)}
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
                                  disabled={redeemingPoints}
                                  style={{
                                    flex: 1,
                                    borderRadius: 20,
                                    alignItems: "center",
                                    paddingVertical: 12,
                                    backgroundColor: redeemingPoints ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.05)",
                                    borderWidth: 1,
                                    borderColor: "rgba(255, 255, 255, 0.2)",
                                    opacity: redeemingPoints ? 0.6 : 1
                                  }}
                                >
                                  <Text style={{ color: "#fff", fontWeight: "600", fontSize: 12 }}>
                                    {redeemingPoints ? "Creating..." : "Redeem & Checkout"}
                                  </Text>
                                </Pressable>
                              )}
                            </View>
                          ) : (
                            // When user can't afford - show full width Add to Cart with learn link below
                            <View style={{ marginTop: 16 }}>
                  <Pressable
                    onPress={() => toggleItemInCart(product)}
                    style={{
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
                              
                              <Pressable
                                onPress={() => router.push("/rewards")}
                                style={{ alignItems: "center", marginTop: 8 }}
                              >
                                <Text style={{ 
                                  color: "rgba(255, 255, 255, 0.7)", 
                                  fontSize: 12, 
                                  textDecorationLine: "underline" 
                                }}>
                                  Learn how to earn points
                                </Text>
                              </Pressable>
                            </View>
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
                        </GlassCard>
                      );
                    })}
                  </View>
                )}

                {/* Need More Points Products Section */}
                {needMorePointsProducts.length > 0 && (
                  <View style={{ gap: 16 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                      <View style={{ 
                        width: 24, 
                        height: 24, 
                        borderRadius: 12, 
                        backgroundColor: "rgba(255, 255, 255, 0.1)", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        marginRight: 12 
                      }}>
                        <Feather name="trending-up" size={14} color="rgba(255, 255, 255, 0.6)" />
                      </View>
                      <Text style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: 18, fontWeight: "600" }}>
                        Need More Points ({needMorePointsProducts.length})
                      </Text>
                    </View>
                    
                    {needMorePointsProducts.map((product) => {
                      const productSku = product.handle;
                      const isPurchased = hasPurchased(productSku);
                      const inCart = inCartSet.has(productSku);
                      const imageUrl = getProductImage(product) || undefined;
                      const price = formatPrice(
                        product.priceRange.minVariantPrice.amount,
                        product.priceRange.minVariantPrice.currencyCode
                      );
                      const pointsRequired = getProductPointValue(productSku);
                      
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
                          <Pressable
                            onPress={() => router.push({
                              pathname: "/shop/product-detail",
                              params: { productId: product.id }
                            })}
                            style={{ flexDirection: "row", gap: 16, alignItems: "center" }}
                          >
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
                              <Text style={{ color: "rgba(255,255,255,0.4)", marginTop: 2, fontSize: 11, fontWeight: "500" }}>
                                {pointsRequired} points
                              </Text>
                              {product.tags.length > 0 && (
                                <Text style={{ color: "rgba(255,255,255,0.5)", marginTop: 2, fontSize: 10 }}>
                                  Tags: {product.tags.slice(0, 3).join(", ")}
                                </Text>
                              )}
                            </View>
                          </Pressable>

                          {/* CTAs */}
                          <View style={{ marginTop: 16 }}>
                            <Pressable
                              onPress={() => toggleItemInCart(product)}
                              style={{
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
                            
                            <Pressable
                              onPress={() => router.push("/rewards")}
                              style={{ alignItems: "center", marginTop: 8 }}
                            >
                              <Text style={{ 
                                color: "rgba(255, 255, 255, 0.7)", 
                                fontSize: 12, 
                                textDecorationLine: "underline" 
                              }}>
                                Learn how to earn points
                              </Text>
                            </Pressable>

                            {isPurchased && (
                              <Pressable
                                style={{ 
                                  borderRadius: 20, 
                                  borderWidth: 1, 
                                  borderColor: "rgba(255,255,255,0.4)", 
                                  backgroundColor: "rgba(255,255,255,0.1)", 
                                  alignItems: "center", 
                                  paddingVertical: 12,
                                  marginTop: 8
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
                • Points available: {pointsTotal}
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
                // Deduct points from user's account
                earn(-activeRedemption.pointsUsed, "Product redemption", {
                  discountAmount: activeRedemption.discountAmount,
                  discountCode: activeRedemption.discountCode,
                  completedAt: new Date().toISOString()
                });
                
                // Redirect to thank you page with point redemption info
                router.replace({ 
                  pathname: "/(shop)/thank-you", 
                  params: { 
                    auto: "1",
                    pointsUsed: activeRedemption.pointsUsed.toString(),
                    newBalance: (pointsTotal - activeRedemption.pointsUsed).toString()
                  } 
                });
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
            <Pressable onPress={() => {
              Alert.alert(
                "Cancel Checkout?",
                "Are you sure you want to close the checkout? Your points will not be deducted if you haven't completed the purchase.",
                [
                  { text: "Continue Shopping", style: "cancel" },
                  { text: "Close", onPress: onClose }
                ]
              );
            }} style={{ padding: 8 }}>
              <Feather name="x" size={24} color="#666" />
            </Pressable>
          </View>
          
          {/* WebView */}
          <WebView
            source={{ uri: url }}
            style={{ flex: 1 }}
            onNavigationStateChange={(navState) => {
              console.log("WebView navigation:", navState.url);
              // Check if checkout is complete
              if (navState.url.includes("thank-you") || 
                  navState.url.includes("success") || 
                  navState.url.includes("order") ||
                  navState.url.includes("confirmation") ||
                  navState.url.includes("checkout/success")) {
                console.log("Checkout completed, calling onComplete");
                onComplete?.(navState.url);
              }
            }}
            onShouldStartLoadWithRequest={(request) => {
              console.log("WebView should start load:", request.url);
              // Allow all requests for now to avoid blocking legitimate checkout flows
              return true;
            }}
            onError={(error) => {
              console.log("WebView error:", error);
            }}
            onHttpError={(error) => {
              console.log("WebView HTTP error:", error);
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
