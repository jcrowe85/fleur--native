// src/screens/RewardsScreen.tsx
import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ImageBackground,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import dayjs from "dayjs";

import { useRewardsStore } from "@/state/rewardsStore";
// ✅ Shared bottom spacing helper (same convention)
import { ScreenScrollView } from "@/components/UI/bottom-space";
import { fetchRedeemableProducts, ShopifyProduct } from "@/services/shopifyClient";
import { getProductPointValue } from "@/data/productPointCatalog";
import RewardsPill from "@/components/UI/RewardsPill";
import PointsContainer from "@/components/UI/PointsContainer";
import HowToEarnPointsPopup from "@/components/HowToEarnPointsPopup";

// Helper function to abbreviate product names
function abbreviateProductName(name: string): string {
  const abbreviations: Record<string, string> = {
    "Gentle Cleanser": "Cleanser",
    "Lightweight Conditioner": "Conditioner", 
    "Growth Serum": "Serum",
    "Scalp Scrub": "Scrub",
    "Bond Repair Mask": "Mask",
    "Heat Protectant Spray": "Heat Spray",
    "Vitamin D Supplement": "Vitamin D",
    "Biotin Supplement": "Biotin",
    "Silk Pillowcase": "Pillowcase",
    "Complete Hair Care Kit": "Complete Kit"
  };
  
  return abbreviations[name] || name.split(' ')[0]; // Fallback to first word
}

function getProductProgressInfo(points: number) {
  // Get all products with their point values from Shopify catalog
  const allProducts = [
    { name: "Detangling Comb", pointsRequired: 250 },
    { name: "Biotin Supplement", pointsRequired: 500 },
    { name: "Vitamin D3 Supplement", pointsRequired: 500 },
    { name: "Iron Supplement", pointsRequired: 500 },
    { name: "Silk Pillowcase", pointsRequired: 650 },
    { name: "Heat Shield Spray", pointsRequired: 700 },
    { name: "Derma Stamp", pointsRequired: 725 },
    { name: "Gentle Shampoo", pointsRequired: 750 },
    { name: "Lightweight Conditioner", pointsRequired: 780 },
    { name: "Hair Growth Serum", pointsRequired: 850 },
    { name: "Bond Repair Mask", pointsRequired: 900 },
    { name: "Complete Hair Kit", pointsRequired: 3500 },
  ];
  
  const sortedProducts = allProducts.sort((a, b) => a.pointsRequired - b.pointsRequired);
  const currentProductIndex = sortedProducts.findIndex(p => p.pointsRequired > points);
  
  if (currentProductIndex === 0) {
    // User hasn't reached the first product yet
    const firstProduct = sortedProducts[0];
    const percent = Math.min(1, points / firstProduct.pointsRequired);
    return {
      currentLabel: "Getting Started",
      nextLabel: abbreviateProductName(firstProduct.name),
      remainingLabel: `Next unlock in ${firstProduct.pointsRequired - points} pts`,
      percent,
    };
  }
  
  if (currentProductIndex === -1) {
    // User can afford all products
    return {
      currentLabel: "All Products",
      nextLabel: "Unlocked",
      remainingLabel: "All products available!",
      percent: 1,
    };
  }

  // User is between products
  const previousProduct = sortedProducts[currentProductIndex - 1];
  const nextProduct = sortedProducts[currentProductIndex];
  const percent = Math.min(1, (points - previousProduct.pointsRequired) / (nextProduct.pointsRequired - previousProduct.pointsRequired));

  return {
    currentLabel: abbreviateProductName(previousProduct.name),
    nextLabel: abbreviateProductName(nextProduct.name),
    remainingLabel: `Next unlock in ${nextProduct.pointsRequired - points} pts`,
    percent,
  };
}

function reasonLabel(reason: string, meta?: any) {
  switch (reason) {
    case "Sign up bonus": return "Welcome bonus";
    case "daily_check_in": return "Daily check-in";
    case "seven_day_streak_bonus": return "7-day streak bonus";
    case "daily_routine_task": return "Daily routine task";
    case "daily_routine_task_reversed": return "Routine task undone";
    case "first_routine_step_bonus": return "First routine step";
    case "start_routine": return "Started routine";
    case "first_post": return "First community post";
    case "first_comment": return "First comment";
    case "first_like": return "First like";
    case "post_engagement_likes": return "Post engagement (likes)";
    case "post_engagement_comments": return "Post engagement (comments)";
    case "write_review": return "Product review";
    case "refer_friend": return "Referral";
    case "purchase": 
      if (meta?.amount) {
        return `Purchase ($${meta.amount})`;
      }
      return "Purchase";
    case "redeem": return "Redeemed";
    default: return reason.replace(/_/g, " ");
  }
}

// Redeemable Products Grid Component
function RedeemableProductsGrid({ userPoints }: { userPoints: number }) {
  const [shopifyProducts, setShopifyProducts] = React.useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const products = await fetchRedeemableProducts();
      setShopifyProducts(products);
    } catch (error) {
      console.error("Failed to load products:", error);
    } finally {
      setLoading(false);
    }
  };

  // Map Shopify products to our format with point values
  const allProducts = shopifyProducts.map(product => {
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

    return {
      sku: productSku,
      name: product.title,
      priceCents: Math.round(parseFloat(product.priceRange.minVariantPrice.amount) * 100),
      pointsRequired,
      imageUrl: product.images?.edges?.[0]?.node?.url || null,
      shopifyId: product.id, // Add the Shopify product ID
    };
  }).filter(product => product.pointsRequired > 0); // Only show products with point values

  const affordableProducts = allProducts.filter(product => userPoints >= product.pointsRequired);

  const handleRedeem = (product: any) => {
    // Navigate to shop with the product pre-selected
    router.push(`/(app)/shop?redeem=${product.sku}`);
  };

  // Group products by point cost
  const productsByPoints = allProducts.reduce((groups, product) => {
    const points = product.pointsRequired;
    if (!groups[points]) {
      groups[points] = [];
    }
    groups[points].push(product);
    return groups;
  }, {} as Record<number, any[]>);

  // Sort point groups in ascending order
  const sortedPointGroups = Object.keys(productsByPoints)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <View style={styles.productsContainer}>
      {sortedPointGroups.map((points) => {
        const products = productsByPoints[points];
        const canAffordAny = products.some(p => userPoints >= p.pointsRequired);
        
        return (
          <View key={points} style={styles.pointGroup}>
            {/* Point Group Header */}
            <View style={[
              styles.pointGroupHeader,
              !canAffordAny && styles.pointGroupHeaderDisabled
            ]}>
              <Text style={[
                styles.pointGroupTitle,
                !canAffordAny && styles.pointGroupTitleDisabled
              ]}>
                {points} POINTS
              </Text>
              {!canAffordAny && (
                <Feather name="lock" size={16} color="rgba(255,255,255,0.4)" />
              )}
            </View>

            {/* Products in this point group */}
            <View style={styles.productsGrid}>
              {products.map((product) => {
                const canAfford = userPoints >= product.pointsRequired;
                
                return (
                  <Pressable
                    key={product.sku}
                    onPress={() => router.push({
                      pathname: "/shop/product-detail",
                      params: { 
                        productId: product.shopifyId,
                        returnTo: "/rewards"
                      }
                    })}
                    style={[
                      styles.productCard,
                      !canAfford && styles.productCardDisabled
                    ]}
                  >
                    {/* Product Image */}
                    <View style={[
                      styles.productImage,
                      !canAfford && styles.productImageDisabled
                    ]}>
                      {product.imageUrl ? (
                        <Image
                          source={{ uri: product.imageUrl }}
                          style={{ width: "100%", height: "100%", borderRadius: 8 }}
                          resizeMode="cover"
                          onError={() => {
                            // Fallback to icon if image fails
                          }}
                        />
                      ) : (
                        <Feather 
                          name="package" 
                          size={24} 
                          color={canAfford ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)"} 
                        />
                      )}
                    </View>

                    {/* Product Info */}
                    <View style={styles.productInfo}>
                      <Text style={[
                        styles.productName,
                        !canAfford && styles.productNameDisabled
                      ]} numberOfLines={2}>
                        {product.name}
                      </Text>
                      
                      <Text style={[
                        styles.productPrice,
                        !canAfford && styles.productPriceDisabled
                      ]}>
                        ${(product.priceCents / 100).toFixed(2)}
                      </Text>
                    </View>

                    {/* Action Button */}
                    <View style={styles.productAction}>
                      {canAfford ? (
                        <Pressable
                          style={styles.redeemButton}
                          onPress={() => handleRedeem(product)}
                        >
                          <Text style={styles.redeemButtonText}>Redeem</Text>
                        </Pressable>
                      ) : (
                        <View style={styles.pointsNeededContainer}>
                          <Text style={styles.pointsNeededText}>
                            {product.pointsRequired - userPoints} pts needed
                          </Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function RewardsScreen() {
  const points = useRewardsStore((s) => s.pointsAvailable);
  const ledger = useRewardsStore((s) => s.ledger);
  const scrollViewRef = React.useRef<any>(null);

  const [showHowToEarnPopup, setShowHowToEarnPopup] = React.useState(false);

  const progress = React.useMemo(() => getProductProgressInfo(points), [points]);
  const recent = ledger.slice(0, 8);


  const scrollToRedeemSection = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 400, animated: true }); // Adjust this value as needed
    }
  };


  return (
    <View style={{ flex: 1, backgroundColor: "#120d0a" }}>
      <ImageBackground
        source={require("../../assets/dashboard.png")}
        resizeMode="cover"
        style={StyleSheet.absoluteFillObject as any}
      />
      <StatusBar style="light" />

      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        {/* Header */}
        <View style={styles.headerWrap}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 16, position: "relative" }}>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={styles.headerTitle}>Rewards</Text>
              <Text style={styles.headerSub}>Earn points & free gifts</Text>
            </View>

            <View style={[styles.rewardsPillContainer, { padding: 8, borderRadius: 20 }]}>
              <RewardsPill compact />
            </View>
          </View>
        </View>

        <ScreenScrollView
          ref={scrollViewRef}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6 }}
          bottomExtra={24} // ← same convention as other screens
          showsVerticalScrollIndicator={false}
        >
          {/* Points Display Block */}
          <PointsContainer 
            points={points} 
            onRedeemPress={scrollToRedeemSection}
          />

          {/* Ways to earn (ALWAYS visible) */}
          <Text style={styles.sectionTitle}>Ways to earn</Text>
          <View style={styles.grid}>
            <EarnSquare
              icon="calendar"
              title="Start your routine"
              points="+5"
              onPress={() => router.push("/(app)/routine")}
            />
            <EarnSquare
              icon="message-circle"
              title="Make your first post"
              points="+5"
              onPress={() => router.push("/(app)/community")}
            />
            <EarnSquare
              icon="gift"
              title="Refer a friend"
              points="+20"
              onPress={() => router.push("/(app)/invite-friends")}
            />
            <EarnSquare
              icon="shopping-bag"
              title="Shop & earn"
              points="1/$"
              onPress={() => router.push("/(app)/shop")}
            />
            <EarnSquare
              icon="star"
              title="Write a review"
              points="+5"
              onPress={() => router.push("/(app)/community?tab=reviews")}
            />
          </View>

          {/* How to earn points link */}
            <Pressable
            onPress={() => setShowHowToEarnPopup(true)}
            style={styles.howToEarnLink}
              accessibilityRole="button"
            accessibilityLabel="View detailed points earning guide"
          >
            <View style={styles.howToEarnLinkContent}>
              <Feather name="info" size={16} color="rgba(255,255,255,0.7)" />
              <Text style={styles.howToEarnLinkText}>View detailed points guide</Text>
              <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.7)" />
            </View>
            </Pressable>

          {/* Redeemable Products Section */}
          <Text style={styles.sectionTitle}>Redeem with points</Text>
          <RedeemableProductsGrid userPoints={points} />

          {/* Recent activity (ledger) */}
          {recent.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Recent activity</Text>
              <View style={styles.ledgerWrap}>
                {recent.map((ev, i) => (
                  <View
                    key={ev.id}
                    style={[styles.ledgerRow, i !== 0 && styles.ledgerRowBorder]}
                  >
                    <View style={styles.ledgerLeft}>
                      <View style={styles.ledgerIcon}>
                        <Feather
                          name={ev.delta >= 0 ? "arrow-up-right" : "arrow-down-right"}
                          size={14}
                          color="#fff"
                        />
                      </View>
                      <View style={{ flexShrink: 1 }}>
                        <Text style={styles.ledgerTitle}>{reasonLabel(ev.reason, ev.meta)}</Text>
                        <Text style={styles.ledgerSub}>
                          {dayjs(ev.ts).format("MMM D, h:mm a")}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={[
                        styles.ledgerDelta,
                        ev.delta >= 0 ? styles.deltaPositive : styles.deltaNegative,
                      ]}
                    >
                      {ev.delta >= 0 ? `+${ev.delta}` : ev.delta}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* See All Points Button */}
          <Pressable 
            onPress={() => router.push("/(app)/routine-points")} 
            style={[styles.longBtn, styles.longBtnGhost, { marginTop: 20 }]}
          >
            <Text style={styles.longBtnGhostText}>See Points Ledger</Text>
          </Pressable>
        </ScreenScrollView>
      </SafeAreaView>


      {/* How to Earn Points Popup */}
      <HowToEarnPointsPopup 
        visible={showHowToEarnPopup} 
        onClose={() => setShowHowToEarnPopup(false)} 
      />
    </View>
  );
}

/* ------------ components ------------ */

function GlassCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[styles.glassCard, style]}>
      {children}
    </View>
  );
}

function EarnSquare({
  icon,
  title,
  points,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  points: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.square}>
      <View style={styles.squareIconWrap}>
        <Feather name={icon} size={18} color="#fff" />
      </View>
      <Text numberOfLines={2} style={styles.squareTitle}>
        {title}
      </Text>
      <Text style={styles.squarePoints}>{points}</Text>
    </Pressable>
  );
}

function Rule({ line, sub }: { line: string; sub?: string }) {
  return (
    <View style={styles.ruleRow}>
      <Feather name="check" size={14} color="#fff" />
      <View style={{ marginLeft: 8, flex: 1 }}>
        <Text style={styles.ruleLine}>{line}</Text>
        {!!sub && <Text style={styles.ruleSub}>{sub}</Text>}
      </View>
    </View>
  );
}

/* ------------ styles ------------ */

const styles = StyleSheet.create({
  safe: { flex: 1 },

  // Match Community header
  headerWrap: {
    paddingTop: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "600", textAlign: "center" },
  headerSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 4, textAlign: "center" },
  rewardsPillContainer: {
    position: "absolute",
    right: 16,
    top: -24,
  },

  glassCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  card: { marginTop: 8, marginBottom: 14 },
  cardShadow: {
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  cardBodyAlt: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },

  pointsTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pointsLabel: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginLeft: 8 },
  pointsValue: { color: "#fff", fontSize: 40, fontWeight: "800" },

  // Redeem button styles
  redeemButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 6.8,
    borderRadius: 13.6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    marginTop: 0,
    alignSelf: "flex-start",
  },
  redeemButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  badgeText: { color: "#fff", fontWeight: "700", fontSize: 12 },

  availableItemsContainer: {
    alignItems: "flex-start",
    marginBottom: 8,
  },
  availableItemsText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "left",
  },

  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    overflow: "hidden",
  },
  progressFill: { height: 8, borderRadius: 999, backgroundColor: "#fff" },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  progressLeft: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "600" },
  progressRight: { color: "rgba(255,255,255,0.8)", fontSize: 12 },

  sectionTitle: {
    marginTop: 6,
    marginBottom: 8,
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },
  howToEarnLink: {
    marginBottom: 24,
  },
  howToEarnLinkContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  howToEarnLinkText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "500",
    marginHorizontal: 8,
  },
  square: {
    width: "48%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.06)",
    padding: 12,
  },
  squareIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    marginBottom: 8,
  },
  squareTitle: { color: "#fff", fontWeight: "600", lineHeight: 18 },
  squarePoints: { color: "rgba(255,255,255,0.75)", marginTop: 6, fontWeight: "700" },

  // Accordion (details only)
  accordion: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    marginTop: 8,
    marginBottom: 10,
  },
  accHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accTitle: { color: "#fff", fontWeight: "700", fontSize: 16 },
  accBody: { padding: 14, paddingTop: 0 },
  accLead: { color: "rgba(255,255,255,0.85)", marginTop: 6, marginBottom: 10 },

  rulesWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.18)",
    paddingTop: 10,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    columnGap: 6,
    marginBottom: 8,
  },
  ruleLine: { color: "#fff", fontWeight: "700" },
  ruleSub: { color: "rgba(255,255,255,0.78)", marginTop: 2, fontSize: 12 },

  // Ledger styles
  ledgerWrap: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  ledgerRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ledgerRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.18)",
  },
  ledgerLeft: { flexDirection: "row", alignItems: "center", columnGap: 10 },
  ledgerIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  ledgerTitle: { color: "#fff", fontWeight: "700" },
  ledgerSub: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 },

  ledgerDelta: { fontWeight: "800" },
  deltaPositive: { color: "#a7ffb0" },
  deltaNegative: { color: "#ffb4b4" },

  // Product Grid Styles
  productsContainer: {
    marginBottom: 24,
  },
  pointGroup: {
    marginBottom: 20,
  },
  pointGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  pointGroupHeaderDisabled: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.15)",
  },
  pointGroupTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  pointGroupTitleDisabled: {
    color: "rgba(255,255,255,0.5)",
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  productCard: {
    width: "48%", // 2 columns with gap
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  productCardDisabled: {
    opacity: 0.4,
  },
  productImage: {
    width: "100%",
    height: 120,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  productImageDisabled: {
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  productInfo: {
    marginBottom: 8,
  },
  productName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  productNameDisabled: {
    color: "rgba(255,255,255,0.5)",
  },
  productPrice: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "500",
  },
  productPriceDisabled: {
    color: "rgba(255,255,255,0.4)",
  },
  productAction: {
    alignItems: "center",
  },
  pointsNeededContainer: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 6,
    width: "100%",
    alignItems: "center",
  },
  pointsNeededText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    fontWeight: "500",
    textAlign: "center",
  },

  // Button styles
  longBtn: {
    borderRadius: 999,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  longBtnGhost: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.30)",
  },
  longBtnGhostText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
