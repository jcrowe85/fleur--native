// src/screens/ProductDetailScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ImageBackground,
  Pressable,
  Image,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useRewardsStore } from "@/state/rewardsStore";
import { useAuthStore } from "@/state/authStore";
import { useCartStore } from "@/state/cartStore";
import { getProductPointValue, canAffordProduct } from "@/data/productPointCatalog";
import { createSeamlessCheckoutWithDiscount } from "@/services/shopifyClient";
import { fetchRedeemableProducts } from "@/services/shopifyClient";
import { ScreenScrollView } from "@/components/UI/bottom-space";

const { width } = Dimensions.get("window");

/** Default placeholder images */
const DEFAULT_PRODUCT_IMAGE = require("../../assets/kit/serum.png");

function GlassCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[styles.glassCard, style]}>
      {children}
    </View>
  );
}

function ProductImage({ uri, title }: { uri: string; title: string }) {
  if (uri && uri !== "null") {
    return (
      <Image
        source={{ uri }}
        style={styles.productImage}
        resizeMode="cover"
        onError={() => console.log("Failed to load product image:", uri)}
      />
    );
  }
  return (
    <View style={[styles.productImage, styles.placeholderImage]}>
      <Feather name="image" size={24} color="rgba(255,255,255,0.3)" />
    </View>
  );
}

export default function ProductDetailScreen() {
  const { productId, returnTo } = useLocalSearchParams<{ productId: string; returnTo?: string }>();
  const { pointsTotal } = useRewardsStore();
  const { user } = useAuthStore();
  const { addItem, removeItem, items } = useCartStore();
  
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [redeemingPoints, setRedeemingPoints] = useState(false);

  useEffect(() => {
    if (productId) {
      loadProduct();
    }
  }, [productId]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      
      // Fetch products from Shopify to find the one with matching ID
      const products = await fetchRedeemableProducts();
      const foundProduct = products.find(p => p.id === productId);
      
      if (foundProduct) {
        setProduct(foundProduct);
      } else {
        Alert.alert("Error", "Product not found");
        router.back();
      }
    } catch (error) {
      console.error("Error loading product:", error);
      Alert.alert("Error", "Failed to load product details");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (amount: string, currencyCode: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
    }).format(parseFloat(amount));
  };

  const toggleItemInCart = (product: any) => {
    const productSku = product.handle || 
                     product.title.toLowerCase().replace(/\s+/g, '-') ||
                     product.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    const isInCart = items.some(item => item.sku === productSku);
    if (isInCart) {
      removeItem(productSku);
    } else {
      addItem({
        sku: productSku,
        name: product.title,
        price: parseFloat(product.priceRange.minVariantPrice.amount),
        quantity: 1,
        image: product.images?.edges?.[0]?.node?.url || null
      });
    }
  };

  const handleRedeemPoints = async (product: any) => {
    if (!user) {
      Alert.alert("Authentication Required", "Please log in to redeem points.");
      return;
    }

    try {
      setRedeemingPoints(true);
      
      // Get product SKU and points required
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

      // Create seamless checkout with discount pre-applied
      const checkoutResult = await createSeamlessCheckoutWithDiscount(finalSku, user.id, pointsTotal);
      
      // Open checkout URL
      const { Linking } = require("react-native");
      await Linking.openURL(checkoutResult.checkoutUrl);
      
    } catch (error) {
      console.error("Error creating discount code:", error);
      Alert.alert("Error", "Failed to create discount code. Please try again.");
    } finally {
      setRedeemingPoints(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-brand-bg">
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <SafeAreaView className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#fff" />
          <Text className="text-white mt-4">Loading product...</Text>
        </SafeAreaView>
      </View>
    );
  }

  if (!product) {
    return (
      <View className="flex-1 bg-brand-bg">
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <SafeAreaView className="flex-1 items-center justify-center">
          <Text className="text-white text-lg">Product not found</Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-4 rounded-full bg-white px-6 py-3"
          >
            <Text className="text-black font-semibold">Go Back</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  const imageUrl = product.images?.edges?.[0]?.node?.url;
  const price = formatPrice(
    product.priceRange.minVariantPrice.amount,
    product.priceRange.minVariantPrice.currencyCode
  );
  
  // Get points required for this product
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

  const canAfford = canAffordProduct(productSku, pointsTotal);
  const inCart = items.some(item => item.sku === productSku);

  return (
    <View className="flex-1 bg-brand-bg">
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <ImageBackground
        source={require("../../assets/dashboard.png")}
        resizeMode="cover"
        className="absolute inset-0"
      />

      <SafeAreaView className="flex-1">
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.push(returnTo || "/shop")}
            style={styles.backButton}
            hitSlop={10}
          >
            <Feather name="arrow-left" size={18} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
            {product?.title || "Product Details"}
          </Text>
          <View style={{ width: 18 }} />
        </View>

        <ScreenScrollView bottomExtra={20}>
          <View style={{ paddingHorizontal: 20 }}>
            {/* Product Image */}
            <View style={styles.imageContainer}>
            <ProductImage uri={imageUrl} title={product.title} />
          </View>

          {/* Product Info */}
          <View style={styles.productInfo}>
            <View style={styles.productHeader}>
              <View style={styles.pointsContainer}>
                <View style={styles.giftIconContainer}>
                  <Feather name="gift" size={16} color="#fff" />
                </View>
                <Text style={styles.pointsText}>
                  {pointsRequired} Points
                </Text>
              </View>
            </View>

            <Text style={styles.productTitle}>{product.title}</Text>
            <Text style={styles.productDescription}>
              {product.description || "Product from Shopify"}
            </Text>
            <Text style={styles.productPrice}>
              {price} • {pointsRequired} points
            </Text>

            {/* Point Status */}
            {canAfford ? (
              <View style={styles.affordableStatus}>
                <Feather name="check-circle" size={16} color="#fff" />
                <Text style={styles.affordableText}>
                  You can get this FREE with {pointsRequired} points!
                </Text>
              </View>
            ) : (
              <View style={styles.needPointsStatus}>
                <Feather name="trending-up" size={14} color="rgba(255, 255, 255, 0.6)" />
                <Text style={styles.needPointsText}>
                  {pointsRequired - pointsTotal} more points needed
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <Pressable
                onPress={() => toggleItemInCart(product)}
                style={[styles.button, styles.fullWidthCartButton, inCart && styles.cartButtonActive]}
              >
                <Text style={[styles.buttonText, styles.cartButtonText, inCart && styles.cartButtonTextActive]}>
                  {inCart ? "Remove from Cart" : "Add to Cart"}
                </Text>
              </Pressable>

              {canAfford ? (
                <Pressable
                  onPress={() => handleRedeemPoints(product)}
                  disabled={redeemingPoints}
                  style={[styles.button, styles.redeemButton, redeemingPoints && styles.redeemButtonDisabled]}
                >
                  <Text style={styles.redeemButtonText}>
                    {redeemingPoints ? "Creating..." : "Redeem & Checkout"}
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => router.push("/rewards")}
                  style={styles.learnLink}
                >
                  <Text style={styles.learnLinkText}>
                    Learn how to earn points
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
          </View>
        </ScreenScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
    paddingHorizontal: 50,
  },
  imageContainer: {
    height: width * 0.6,
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  placeholderImage: {
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  productInfo: {
    padding: 20,
    marginBottom: 20,
  },
  productHeader: {
    marginBottom: 16,
  },
  pointsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  giftIconContainer: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginRight: 8,
  },
  pointsText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  productTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  productDescription: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  productPrice: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    marginBottom: 16,
  },
  affordableStatus: {
    padding: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  affordableText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 8,
  },
  needPointsStatus: {
    padding: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  needPointsText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 11,
    fontWeight: "500",
    marginLeft: 6,
  },
  actionButtons: {
    marginTop: 8,
  },
  button: {
    borderRadius: 20,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  cartButton: {
    flex: 1,
    backgroundColor: "#fff",
  },
  cartButtonActive: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  fullWidthCartButton: {
    width: "100%",
    backgroundColor: "#fff",
  },
  redeemButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    marginTop: 12,
  },
  redeemButtonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontWeight: "600",
    fontSize: 14,
  },
  cartButtonText: {
    color: "#120d0a",
  },
  cartButtonTextActive: {
    color: "#fff",
  },
  redeemButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  learnLink: {
    marginTop: 12,
  },
  learnLinkText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
    textDecorationLine: "underline",
  },
  glassCard: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backdropFilter: "blur(10px)",
  },
});
