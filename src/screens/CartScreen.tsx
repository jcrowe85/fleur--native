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
import { createCheckout } from "@/services/shopifyClient";

const FALLBACK_IMG = require("../../assets/kit/serum.png");

/* ========= Optional: kit SKUs for upsell ========= */
const KIT_SKUS = [
  "fleur-serum",
  "fleur-derma-stamp",
  "fleur-cleanser-generic",
  "fleur-conditioner-generic",
];

/* ========= Checkout Sheet (inline) ========= */
const CHECKOUT_TOP_OFFSET = 96;

type CheckoutSheetProps = {
  visible: boolean;
  url?: string;
  topOffset?: number;
  onClose: () => void;
  onComplete?: (finalUrl: string) => void;
};

function CheckoutSheet({
  visible,
  url,
  topOffset = CHECKOUT_TOP_OFFSET,
  onClose,
  onComplete,
}: CheckoutSheetProps) {
  const insets = useSafeAreaInsets();
  const sheetTop = Math.max(insets.top + 8, topOffset);
  const HEADER_H = 48;

  if (!visible || !url) return null;

  return (
    <Modal
      animationType="slide"
      transparent
      statusBarTranslucent
      visible={visible}
      onRequestClose={onClose}
    >
      {/* dim background */}
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
        {/* sheet container */}
        <View
          style={{
            position: "absolute",
            top: sheetTop,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#fff",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: "hidden",
          }}
        >
          {/* header */}
          <View
            style={{
              height: HEADER_H,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.96)",
            }}
          >
            <Text style={{ fontWeight: "600" }}>Secure Checkout</Text>
            <Pressable
              onPress={onClose}
              style={{ position: "absolute", right: 10, top: 6, padding: 8 }}
              hitSlop={8}
            >
              <Feather name="x" size={22} color="#111" />
            </Pressable>
          </View>

          {/* webview */}
          <WebView
            source={{ uri: url }}
            style={{ flex: 1 }}
            containerStyle={{ marginTop: 0 }}
            contentInset={{ top: 0, left: 0, bottom: 0, right: 0 }}
            onNavigationStateChange={(nav) => {
              // Detect Shopify success URL (examples vary)
              if (/thank[_-]?you|orders\/\d+\/thank[_-]?you/i.test(nav.url)) {
                onComplete?.(nav.url);
              }
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
  const total = subtotal;

  const skuSet = useMemo(() => new Set(items.map((i) => i.sku)), [items]);
  const hasFullKit = KIT_SKUS.every((sku) => skuSet.has(sku));

  async function onCheckout() {
    if (items.length === 0) return;
    try {
      setBusy(true);
      const lineItems = items
        .filter((it) => !!it.variantId)
        .map((it) => ({ variantId: it.variantId!, quantity: it.qty }));

      if (lineItems.length === 0) {
        Alert.alert("Cart items missing variants", "Please try adding items again.");
        setBusy(false);
        return;
      }

      const { webUrl } = await createCheckout(lineItems); // cartCreate under the hood
      setCheckoutUrl(webUrl); // open in-sheet instead of external browser
    } catch (e: any) {
      Alert.alert("Checkout error", e?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const hasItems = items.length > 0;

  function onAddKit() {
    addSkusQuick(KIT_SKUS);
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
        <LinearGradient
          colors={["rgba(0,0,0,0.10)", "rgba(0,0,0,0.35)", "rgba(0,0,0,0.70)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          className="absolute inset-0"
        />
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
                  <Text className="text-white font-semibold">Build a bundle & save 20%</Text>
                  <Text className="text-white/75 text-xs mt-1">
                    Add the full routine to maximize results and unlock bundle savings.
                  </Text>
                </View>
                <Pressable
                  onPress={onAddKit}
                  className="px-4 py-2 rounded-full bg-white active:opacity-90"
                >
                  <Text className="text-brand-bg font-semibold">Add Kit</Text>
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
          topOffset={76}
          onClose={() => setCheckoutUrl(null)}
          onComplete={(finalUrl) => {
            setCheckoutUrl(null);
            clear(); // optional: empty cart after success
            router.replace({ pathname: "/(shop)/thank-you", params: { auto: "1" } });
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
  return (
    <View className="flex-row items-center justify-between mb-3">
      <Text className={`text-white/85 ${bold ? "font-semibold" : ""}`}>{label}</Text>
      <Text className={`text-white ${bold ? "font-semibold" : ""}`}>{val}</Text>
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
  const [failed, setFailed] = React.useState(false);
  const source = !uri || failed ? FALLBACK_IMG : { uri };
  return (
    <View style={{ width: 72, height: 72 }}>
      <Image
        source={source}
        onError={() => setFailed(true)}
        style={{ width: 72, height: 72, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)" }}
        resizeMode="cover"
      />
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
