// src/screens/CartScreen.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  Alert,
  Modal,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { WebView } from "react-native-webview";

import { useCartStore } from "@/state/cartStore";
import { usePlanStore } from "@/state/planStore";
import { usePurchaseStore } from "@/state/purchaseStore";
import { createCheckout, createKitDiscountCode } from "@/services/shopifyClient";
import { useAuthStore } from "@/state/authStore";

/* ========= Optional: kit SKUs for upsell ========= */
const KIT_SKUS = [
  "bloom",                 // bloom hair+scalp serum
  "micro-roller",          // Derma Stamp
  "shampoo",               // shampoo
  "conditioner",           // conditioner
];

/* ========= Checkout Sheet (inline) ========= */

type CheckoutSheetProps = {
  visible: boolean;
  url?: string;
  onClose: () => void;
  onComplete?: (finalUrl: string) => void;
};

function CheckoutSheet({
  visible,
  url,
  onClose,
  onComplete,
}: CheckoutSheetProps) {
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
                "Are you sure you want to close the checkout? Your order will be lost if you haven't completed the purchase.",
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

/* ========== Screen ========== */
export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { items, increment, decrement, remove, clear, addSkusQuick } = useCartStore();
  const { user } = useAuthStore();
  const { plan } = usePlanStore();
  const [busy, setBusy] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();

  // Helper function to navigate back to the correct screen
  const goBack = () => {
    if (returnTo) {
      router.push(returnTo as any);
    } else {
      // Default fallback to recommendations
      router.push("/(plan)/recommendations");
    }
  };

  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + (it.priceCents || 0) * it.qty, 0),
    [items]
  );
  const itemCount = useMemo(() => items.reduce((n, it) => n + it.qty, 0), [items]);
  
  const skuSet = useMemo(() => new Set(items.map((i) => i.sku)), [items]);
  
  // Check if user has all their recommended products (the actual "kit" for them)
  const recommendedHandles = useMemo(() => 
    plan?.recommendations?.map((rec: any) => rec.handle) || [], 
    [plan?.recommendations]
  );
  
  const hasFullKit = useMemo(() => {
    if (recommendedHandles.length === 0) {
      // Fallback to hardcoded KIT_SKUS if no recommendations available
      return KIT_SKUS.every((sku) => skuSet.has(sku));
    }
    // Check if user has all their recommended products
    return recommendedHandles.every((handle: string) => skuSet.has(handle));
  }, [skuSet, recommendedHandles]);
  
  // Calculate kit discount (20% off when full kit is in cart)
  const kitDiscount = useMemo(() => {
    if (!hasFullKit) return 0;
    return Math.round(subtotal * 0.2); // 20% discount
  }, [hasFullKit, subtotal]);
  
  const total = subtotal - kitDiscount;

  async function onCheckout() {
    if (items.length === 0) return;
    try {
      setBusy(true);
      console.log("🚀 Starting checkout process...");
      console.log("📋 Cart items:", items);
      console.log("👤 User ID:", user?.id);
      console.log("🎯 Has full kit:", hasFullKit);
      console.log("📊 Recommended handles:", recommendedHandles);

      // Ensure user is authenticated before proceeding
      if (!user?.id) {
        console.log("⚠️ No user ID found, attempting to bootstrap auth...");
        const { bootstrap } = useAuthStore.getState();
        await bootstrap();
        
        // Check again after bootstrap
        const { user: updatedUser } = useAuthStore.getState();
        if (!updatedUser?.id) {
          Alert.alert("Authentication Error", "Please restart the app and try again.");
          setBusy(false);
          return;
        }
        console.log("✅ Auth bootstrap successful, user ID:", updatedUser.id);
        console.log("🔍 Profile should be created with first_login: true");
      }

      // Only allow products that actually have valid variant IDs in Shopify
      const VALID_SKUS = [
        'bloom', 'micro-roller', 'detangling-comb', 'vegan-biotin', 'vitamin-d3', 'iron',
        'shampoo', 'conditioner', 'hair-mask', 'heat-shield', 'silk-pillow',
        // Legacy mappings (keep for backward compatibility)
        'fleur-1', 'fleur-derma-stamp', 'fleur-detangling-comb', 'fleur-biotin', 'fleur-vitamin-d3', 'fleur-iron',
        'fleur-shampoo', 'fleur-conditioner', 'fleur-hair-mask', 'fleur-heat-shield', 'fleur-silk-pillowcase',
        'fleur-serum', 'fleur-repair-mask'
      ];
      
      const lineItems = items
        .filter((it) => {
          // Only allow valid SKUs that we know work in Shopify
          if (!VALID_SKUS.includes(it.sku)) return false;
          if (!it.variantId) return false;
          return true;
        })
        .map((it) => ({ variantId: it.variantId!, quantity: it.qty }));

      if (lineItems.length === 0) {
        Alert.alert(
          "Cannot checkout", 
          "Some items in your cart don't have valid product information. Please remove them and try adding products again from the recommendations page."
        );
        setBusy(false);
        return;
      }

      let webUrl: string;

      // Get the current user (may have been updated by bootstrap)
      const currentUser = useAuthStore.getState().user;
      
      // If user has full kit, create a 20% discount code
      if (hasFullKit && currentUser?.id) {
        try {
          console.log("🎁 Creating kit discount for user:", currentUser.id);
          const cartItems = items.map(item => ({ sku: item.sku, qty: item.qty }));
          console.log("🛒 Cart items for discount:", cartItems);
          console.log("📦 Line items for checkout:", lineItems);
          
          const discountResult = await createKitDiscountCode(currentUser.id, cartItems);
          console.log("✅ Kit discount created:", discountResult);
          
          // Create checkout with discount code
          const result = await createCheckout(lineItems, discountResult.discountCode);
          console.log("🛍️ Checkout created with discount code:", discountResult.discountCode);
          console.log("🔗 Checkout result:", result);
          webUrl = result.webUrl;
        } catch (discountError) {
          console.warn("❌ Failed to create kit discount, proceeding with regular checkout:", discountError);
          const result = await createCheckout(lineItems);
          webUrl = result.webUrl;
        }
      } else {
        console.log("📦 No kit discount - creating regular checkout");
        console.log("📦 Line items for regular checkout:", lineItems);
        const result = await createCheckout(lineItems);
        console.log("🔗 Regular checkout result:", result);
        webUrl = result.webUrl;
      }

      console.log("🔗 Final checkout URL being set:", webUrl);
      setCheckoutUrl(webUrl); // open in-sheet instead of external browser
    } catch (e: any) {
      Alert.alert("Checkout error", e?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const hasItems = items.length > 0;

  function onAddKit() {
    // Use the actual recommended products from the user's plan instead of hardcoded KIT_SKUS
    const recommendedHandles = plan?.recommendations?.map((rec: any) => rec.handle) || [];
    if (recommendedHandles.length > 0) {
      addSkusQuick(recommendedHandles);
    } else {
      // Fallback to hardcoded KIT_SKUS if no recommendations available
      addSkusQuick(KIT_SKUS);
    }
  }
  function onKeepShopping() {
    goBack();
  }
  function onAlreadyHaveEverything() {
    router.replace("/dashboard");
  }

  return (
    <View className="flex-1 bg-brand-bg">
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <ImageBackground
        source={require("../../assets/dashboard.png")}
        resizeMode="cover"
        className="absolute inset-0"
      >
      </ImageBackground>

      <SafeAreaView className="flex-1" edges={["top", "left", "right"]}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-2 pb-3">
          <Pressable onPress={goBack} className="p-2 rounded-full active:opacity-80" hitSlop={8}>
            <Feather name="arrow-right" size={22} color="#fff" style={{ transform: [{ scaleX: -1 }] }} />
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text className="text-white text-[20px] font-semibold">Your Bag</Text>
            <Text className="text-white/80 text-xs mt-1">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </Text>
          </View>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 28 }}
        >
          {/* Items */}
          <View className="gap-4 mb-12">
            {items.map((it) => (
              <GlassRow key={it.sku}>
                <View className="flex-row gap-4 items-center">
                  <ProductImage uri={it.imageUrl} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text className="text-white font-medium" numberOfLines={2}>
                      {it.name}
                    </Text>
                    <Text className="text-white/70 text-xs mt-1">{it.sku}</Text>
                    <Text className="text-white/90 mt-2">
                      ${(it.priceCents / 100).toFixed(2)}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center justify-between mt-4">
                  <QuantityStepper
                    qty={it.qty}
                    onMinus={() => (it.qty > 1 ? decrement(it.sku) : remove(it.sku))}
                    onPlus={() => increment(it.sku)}
                  />
                  <Pressable
                    onPress={() => remove(it.sku)}
                    hitSlop={6}
                    className="px-2 py-1 rounded-full active:opacity-80"
                  >
                    <Text className="text-white/70 text-xs">Remove</Text>
                  </Pressable>
                </View>
              </GlassRow>
            ))}

            {!hasItems && (
              <GlassRow>
                <Text className="text-white/80">Your bag is empty.</Text>
                <Text className="text-white/60 mt-1 text-xs">
                  Add your personalized kit from the recommendations.
                </Text>
              </GlassRow>
            )}
          </View>

          {/* Summary */}
          <GlassCard className="p-5 mb-4">
            <Row label="Subtotal" valueCents={subtotal} />
            {kitDiscount > 0 && (
              <Row label="Kit Bundle Discount (20%)" valueCents={-kitDiscount} />
            )}
            <Row label="Estimated Shipping" value="Calculated at checkout" />
            <Row label="Estimated Tax" value="Calculated at checkout" />
            <View className="h-[1px] bg-white/20 my-10" />
            <Row label="Total" valueCents={total} bold />
          </GlassCard>

          {/* ===== CTAs (clean hierarchy) ===== */}
          {/* Upsell card (only if not already complete kit) */}
          {!hasFullKit && (
            <GlassCard className="p-5 mb-4">
              <View className="flex-row items-center justify-between">
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text className="text-white font-semibold">
                    {recommendedHandles.length > 0 ? "Complete your routine & save 20%" : "Build a bundle & save 20%"}
                  </Text>
                  <Text className="text-white/75 text-xs mt-1">
                    {recommendedHandles.length > 0 
                      ? "Add your remaining recommended products to unlock bundle savings."
                      : "Add the full routine to maximize results and unlock bundle savings."
                    }
                  </Text>
                </View>
                <Pressable
                  onPress={onAddKit}
                  className="px-4 py-2 rounded-full bg-white active:opacity-90"
                >
                  <Text className="text-brand-bg font-semibold">
                    {recommendedHandles.length > 0 ? "Add My Kit" : "Add Kit"}
                  </Text>
                </Pressable>
              </View>
            </GlassCard>
          )}

          {/* Primary action */}
          <Pressable
            disabled={!hasItems || busy}
            onPress={onCheckout}
            className={`rounded-full items-center py-4 active:opacity-90 ${
              hasItems && !busy ? "bg-white" : "bg-white/30"
            }`}
          >
            <View className="flex-row items-center">
              <Text
                className={`${
                  hasItems && !busy ? "text-brand-bg" : "text-white/70"
                } font-semibold`}
              >
                {busy ? "Creating Checkout…" : "Checkout Securely"}
              </Text>
              <Feather
                name="arrow-right"
                size={18}
                color={hasItems && !busy ? "#0b0b0b" : "rgba(255,255,255,0.7)"}
                style={{ marginLeft: 10 }}
              />
            </View>
          </Pressable>

          {/* Secondary row: Keep Shopping & Clear Bag */}
          <View className="flex-row gap-8 mt-10 mb-2">
            <Pressable
              onPress={onKeepShopping}
              className="flex-1 rounded-full border border-white/35 bg-white/10 items-center py-4 active:opacity-90"
            >
              <Text className="text-white font-semibold">Keep Shopping</Text>
            </Pressable>

            {hasItems && (
              <Pressable
                onPress={() => {
                  Alert.alert("Clear cart?", "Remove all items from your bag?", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Clear", style: "destructive", onPress: () => clear() },
                  ]);
                }}
                className="flex-1 rounded-full border border-white/35 bg-white/10 items-center py-4 active:opacity-90"
              >
                <Text className="text-white font-semibold">Clear Bag</Text>
              </Pressable>
            )}
          </View>

          {/* Subtle link-style tertiary */}
          <Pressable onPress={onAlreadyHaveEverything} className="items-center mt-2">
            <Text className="text-white/70 text-xs underline">
              I already have everything I need
            </Text>
          </Pressable>
        </ScrollView>

        {/* Checkout sheet overlay */}
        <CheckoutSheet
          visible={!!checkoutUrl}
          url={checkoutUrl ?? undefined}
          onClose={() => setCheckoutUrl(null)}
          onComplete={(finalUrl) => {
            setCheckoutUrl(null);
            
            // Process purchases and award points
            const { addPurchase } = usePurchaseStore.getState();
            const totalSpent = items.reduce((sum, item) => sum + (item.priceCents * item.qty), 0);
            const totalSpentDollars = totalSpent / 100;
            const pointsEarned = Math.floor(totalSpentDollars);
            
            // Add each item as a separate purchase record
            items.forEach(item => {
              addPurchase({
                sku: item.sku,
                name: item.name,
                priceCents: item.priceCents,
                quantity: item.qty,
              });
            });
            
            clear(); // empty cart after success
            router.replace({ 
              pathname: "/(shop)/thank-you", 
              params: { 
                auto: "1",
                pointsEarned: pointsEarned.toString(),
                totalSpent: totalSpentDollars.toFixed(2)
              } 
            });
          }}
        />
      </SafeAreaView>
    </View>
  );
}

/* ===== Reusable bits ===== */
function Row({
  label,
  value,
  valueCents,
  bold,
}: {
  label: string;
  value?: string;
  valueCents?: number;
  bold?: boolean;
}) {
  const val = typeof valueCents === "number" ? `$${(valueCents / 100).toFixed(2)}` : value || "-";
  const isDiscount = typeof valueCents === "number" && valueCents < 0;
  
  return (
    <View className="flex-row items-center justify-between mb-3">
      <Text className={`text-white/85 ${bold ? "font-semibold" : ""}`}>{label}</Text>
      <Text className={`${isDiscount ? "text-green-400" : "text-white"} ${bold ? "font-semibold" : ""}`}>
        {isDiscount ? `-$${Math.abs(valueCents) / 100}` : val}
      </Text>
    </View>
  );
}

function GlassRow({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-2xl overflow-hidden border border-white/20 p-5">
      <BlurView intensity={20} tint="light" className="absolute inset-0" />
      <View className="relative">{children}</View>
    </View>
  );
}

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <View className={["rounded-2xl overflow-hidden border border-white/20", className].join(" ")}>
      <BlurView intensity={20} tint="light" className="absolute inset-0" />
      <View className="relative">{children}</View>
    </View>
  );
}

function ProductImage({ uri }: { uri?: string }) {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);
  const [currentUri, setCurrentUri] = React.useState(uri);
  
  // Aggressive retry logic - keep trying until image loads
  React.useEffect(() => {
    if (!uri) return;
    
    setImageLoaded(false);
    setRetryCount(0);
    setCurrentUri(uri);
  }, [uri]);

  // Retry mechanism - keep trying every 2 seconds until it loads
  React.useEffect(() => {
    if (!currentUri || imageLoaded) return;
    
    const retryInterval = setInterval(() => {
      setRetryCount(prev => {
        console.log(`Retrying image load for ${currentUri}, attempt ${prev + 1}`);
        return prev + 1;
      });
    }, 2000);

    return () => clearInterval(retryInterval);
  }, [currentUri, imageLoaded]);

  const handleImageLoad = () => {
    console.log(`✅ Image loaded successfully: ${currentUri}`);
    setImageLoaded(true);
  };

  const handleImageError = () => {
    console.log(`❌ Image load failed: ${currentUri}, retry count: ${retryCount}`);
    // Don't set error state - just keep retrying
  };

  // Force image reload on retry
  const imageKey = `${currentUri}-${retryCount}`;

  return (
    <View style={{ width: 72, height: 72, position: 'relative' }}>
      {/* Always show loading spinner until image is loaded */}
      {!imageLoaded && (
        <View style={{ 
          width: 72, 
          height: 72, 
          borderRadius: 12, 
          backgroundColor: "rgba(255,255,255,0.06)",
          alignItems: 'center',
          justifyContent: 'center',
          position: 'absolute',
          zIndex: 1
        }}>
          <Feather name="loader" size={16} color="rgba(255,255,255,0.5)" />
        </View>
      )}

      {/* Image - always render if we have a URI */}
      {currentUri && (
        <Image
          key={imageKey}
          source={{ uri: currentUri }}
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{
            width: 72,
            height: 72,
            borderRadius: 12,
            backgroundColor: "rgba(255,255,255,0.06)",
            opacity: imageLoaded ? 1 : 0,
            position: 'relative'
          }}
          resizeMode="cover"
        />
      )}
    </View>
  );
}

function QuantityStepper({ qty, onMinus, onPlus }: { qty: number; onMinus: () => void; onPlus: () => void }) {
  return (
    <View className="flex-row items-center">
      <Pressable
        onPress={onMinus}
        className="px-3 py-2 rounded-full bg-white/10 border border-white/25 active:opacity-80"
      >
        <Feather name="minus" size={16} color="#fff" />
      </Pressable>
      <Text className="text-white mx-4 font-semibold">{qty}</Text>
      <Pressable onPress={onPlus} className="px-3 py-2 rounded-full bg-white active:opacity-90">
        <Feather name="plus" size={16} color="#0b0b0b" />
      </Pressable>
    </View>
  );
}
