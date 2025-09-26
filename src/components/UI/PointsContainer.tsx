// src/components/UI/PointsContainer.tsx
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { getNextAffordableProduct, getAffordableProducts, getAllRedeemableProducts } from "@/data/productCatalog";

interface PointsContainerProps {
  points: number;
  onRedeemPress: () => void;
}

function getProductProgressInfo(points: number) {
  const nextProduct = getNextAffordableProduct(points);
  const pointsNeeded = nextProduct ? nextProduct.pointsRequired - points : 0;
  
  if (!nextProduct) {
    // User can afford all products
    return {
      currentLabel: "All Products",
      nextLabel: "Unlocked",
      remainingLabel: "All products available!",
      percent: 1,
    };
  }

  // Calculate progress towards the next product
  const allProducts = getAllRedeemableProducts();
  const sortedProducts = allProducts.sort((a, b) => a.pointsRequired - b.pointsRequired);
  const currentProductIndex = sortedProducts.findIndex(p => p.pointsRequired > points);
  
  // Calculate progress from 0 to the next product (not between previous and next)
  const percent = Math.min(1, points / nextProduct.pointsRequired);
  
  if (currentProductIndex === 0) {
    // User hasn't reached the first product yet
    return {
      currentLabel: "Getting Started",
      nextLabel: nextProduct.name,
      remainingLabel: `Next unlock in ${pointsNeeded} pts`,
      percent,
    };
  }

  // User is between products
  const previousProduct = sortedProducts[currentProductIndex - 1];
  return {
    currentLabel: previousProduct.name,
    nextLabel: nextProduct.name,
    remainingLabel: `Next unlock in ${pointsNeeded} pts`,
    percent,
  };
}

function GlassCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[styles.glassCard, style]}>
      {children}
    </View>
  );
}

export default function PointsContainer({ points, onRedeemPress }: PointsContainerProps) {
  const progress = React.useMemo(() => getProductProgressInfo(points), [points]);
  const affordableProducts = getAffordableProducts(points);
  const allProducts = getAllRedeemableProducts();

  return (
    <GlassCard style={{ padding: 17.5, marginBottom: 14, minHeight: 140 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", flexShrink: 1 }}>
          <Text style={styles.pointsValue}>{points}</Text>
          <Text style={styles.pointsLabel}>Points</Text>
        </View>
        
        {/* Redeem Button */}
        <Pressable
          onPress={onRedeemPress}
          style={styles.redeemButton}
        >
          <Text style={styles.redeemButtonText}>Redeem</Text>
        </Pressable>
      </View>

      {/* Progress */}
      <View style={{ marginTop: 20 }}>
        {/* Available Items Count */}
        <View style={styles.availableItemsContainer}>
          <Text style={styles.availableItemsText}>
            {affordableProducts.length} of {allProducts.length} items available
          </Text>
        </View>
        
        {/* Progress Bar (only show if there are items to unlock) */}
        {affordableProducts.length < allProducts.length && (
          <>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress.percent * 100}%` }]} />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLeft}>Progress to {progress.nextLabel}</Text>
              <Text style={styles.progressRight}>{progress.remainingLabel}</Text>
            </View>
          </>
        )}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  glassCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  pointsValue: { color: "#fff", fontSize: 40, fontWeight: "800" },
  pointsLabel: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginLeft: 8 },
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
  },
  redeemButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
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
    backgroundColor: "rgba(255,255,255,0.12)",
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
});
