// app/recommendations.tsx
import React, { useMemo, useState } from "react";
import { View, Text, Image, ImageBackground, ScrollView, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

import { usePlanStore } from "@/state/planStore";
import type { FleurPlan } from "@/types/plans";

import {
  categorize,
  pickKit,
  labelForSlot,
  iconForSlot,
  preferredKitOrder,
  ProductCategory,
} from "@/lib/products";

/** Limit to these 4 slots for the kit view */
type Slot = Extract<ProductCategory, "cleanse" | "condition" | "treat" | "protect">;

/** Tiny text clamp util */
function clamp(str: string, max = 96) {
  if (!str) return "";
  return str.length > max ? `${str.slice(0, max - 1).trim()}…` : str;
}

/** Per-slot default placeholder images (adjust paths if needed) */
const DEFAULT_SLOT_IMAGES: Record<ProductCategory, any> = {
  cleanse: require("../../../assets/kit/serum.png"),
  condition: require("../../../assets/kit/serum.png"),
  treat: require("../../../assets/kit/serum.png"),
  protect: require("../../../assets/kit/serum.png"),
  scalp: require("../../../assets/kit/serum.png"),
  style: require("../../../assets/kit/serum.png"),
  oil: require("../../../assets/kit/serum.png"),
  other: require("../../../assets/kit/serum.png"),
};

/** ----------------------------------------------------------------
 * Core products (always included)
 * ---------------------------------------------------------------- */
const CORE_PRODUCTS = {
  serum: {
    slot: "treat" as const,
    product: {
      sku: "fleur-serum",
      name: "Fleur Peptide Hair Serum",
      imageUrl: undefined, // keep fallback serum.png
    },
    title: "Daily follicle support",
    why: "Lightweight peptide blend for stronger, fuller-looking hair.",
  },
  dermaStamp: {
    slot: "protect" as const, // fits the 4-card layout; usage badge clarifies cadence
    product: {
      sku: "fleur-derma-stamp",
      name: "Derma Stamp (Scalp Tool)",
      imageUrl: undefined,
    },
    title: "Weekly micro-stimulation",
    why: "Targets scalp; complements serum absorption and growth goals.",
  },
};

/** Badges next to slot label (usage + need-to-know) */
function badgesFor(slot: Slot, sku?: string, plan?: FleurPlan | null): string[] {
  const badges: string[] = [];

  // Usage defaults by slot
  if (slot === "treat") badges.push("Daily PM");
  if (slot === "condition") badges.push("2×/wk");
  if (slot === "cleanse") badges.push("Wash days");
  if (slot === "protect") badges.push("1×/wk");

  // SKU-specific tweaks
  if (sku === "fleur-serum") {
    badges.splice(0, badges.length, "Daily PM", "Dry/clean scalp");
  }
  if (sku === "fleur-derma-stamp") {
    badges.splice(0, badges.length, "1×/wk", "Patch test");
  }

  // Very light plan-aware nudge (only if info exists)
  const heatOften =
    (plan as any)?.profile?.heatUse === true ||
    /heat/i.test((plan?.summary?.drivers || []).map((d: any) => d?.label).join(" "));
  if (heatOften && slot === "protect" && !badges.includes("Heat care")) {
    badges.push("Heat care");
  }

  return badges.slice(0, 3); // keep compact
}

/** Small pill badge */
function Badge({ label }: { label: string }) {
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.10)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.28)",
        marginLeft: 6,
      }}
    >
      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

export default function Recommendations() {
  const insets = useSafeAreaInsets();
  const plan = usePlanStore((s) => s.plan);

  const kit = useMemo(() => buildKitFromPlan(plan), [plan]);

  // naive local cart state (stub) — replace with your cart store later
  const [alreadyHave, setAlreadyHave] = useState<Set<string>>(new Set());
  const [pendingCart, setPendingCart] = useState<Set<string>>(new Set());
  const [cartSkus, setCartSkus] = useState<Set<string>>(new Set());

  const cartCount = cartSkus.size;

  const toggleHave = (sku: string) => {
    setAlreadyHave((prev) => {
      const next = new Set(prev);
      next.has(sku) ? next.delete(sku) : next.add(sku);
      return next;
    });
  };

  const toggleItemInBag = (sku: string) => {
    const inCart = cartSkus.has(sku);
    setPendingCart((prev) => new Set(prev).add(sku));

    setTimeout(() => {
      setPendingCart((prev) => {
        const next = new Set(prev);
        next.delete(sku);
        return next;
      });

      setCartSkus((prev) => {
        const next = new Set(prev);
        if (inCart) next.delete(sku);
        else next.add(sku);
        return next;
      });
    }, 120);
  };

  const addKitToBag = () => {
    // NOTE: In real cart logic, apply a 20% discount promo/bundle here.
    const skus = kit.map((k) => k.product.sku);
    if (skus.length === 0) return;
    setCartSkus((prev) => {
      const next = new Set(prev);
      skus.forEach((s) => next.add(s));
      return next;
    });
  };

  const goCart = () => router.push("/cart");

  return (
    <View className="flex-1 bg-brand-bg">
      <StatusBar style="light" translucent backgroundColor="transparent" />

      {/* Background (kept as in your file) */}
      <ImageBackground
        source={require("../../../assets/dashboard.png")}
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
        {/* Header: back left, title center, cart right */}
        <View className="flex-row items-center justify-between px-4 pt-2 pb-3">
          {/* Back button on the left */}
          <Pressable
            onPress={() => router.back()}
            className="p-2 rounded-full active:opacity-80"
            hitSlop={8}
          >
            <Feather
              name="arrow-right"
              size={22}
              color="#fff"
              style={{ transform: [{ scaleX: -1 }] }} // left
            />
          </Pressable>

          <View style={{ flex: 1, alignItems: "center" }}>
            <Text className="text-white text-[20px] font-semibold">Your Kit</Text>
            <Text className="text-white/80 text-xs mt-1">Matched to your Routine</Text>
          </View>

          {/* Cart button on the right */}
          <Pressable
            onPress={goCart}
            hitSlop={8}
            className="p-2 rounded-full active:opacity-80"
            style={{ position: "relative" }}
          >
            <Feather name="shopping-bag" size={22} color="#fff" />
            {cartCount > 0 && (
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
                <Text style={{ color: "#0b0b0b", fontSize: 11, fontWeight: "700" }}>
                  {cartCount}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 6,
            paddingBottom: insets.bottom + 28,
          }}
        >
          {/* Cards */}
          <View className="gap-4 mb-6">
            {kit.map((item) => {
              const slot = item.slot as Slot;
              const have = alreadyHave.has(item.product.sku);
              const loading = pendingCart.has(item.product.sku);
              const inCart = cartSkus.has(item.product.sku);

              const headerBadges = badgesFor(slot, item.product.sku, plan);

              return (
                <GlassCard key={item.product.sku} className="p-5">
                  {/* Header: icon + slot + badges */}
                  <View className="flex-row items-center mb-3">
                    <View className="p-1.5 rounded-full bg-white/15 mr-2">
                      <Feather name={iconForSlot(slot)} size={16} color="#fff" />
                    </View>

                    {/* Slot label */}
                    <Text
                      className="text-white font-semibold"
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {labelForSlot(slot)}
                    </Text>

                    {/* Badges (inline, right after label) */}
                    <View style={{ flexDirection: "row", flexShrink: 1, minWidth: 0, marginLeft: 8 }}>
                      {headerBadges.map((b) => (
                        <Badge key={b} label={b} />
                      ))}
                    </View>
                  </View>

                  {/* Image + content row */}
                  <View className="flex-row gap-4 items-center">
                    <ProductImage uri={item.product.imageUrl} slot={slot} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text className="text-white font-medium" numberOfLines={2} ellipsizeMode="tail">
                        {item.product.name}
                      </Text>
                      <Text className="text-white/80 mt-1" numberOfLines={2} ellipsizeMode="tail">
                        {clamp(item.why || item.title || "", 140)}
                      </Text>
                      <Text className="text-white/60 mt-1 text-xs" numberOfLines={1}>
                        Fits: {fitLineForSlot(slot)}
                      </Text>
                    </View>
                  </View>

                  {/* CTAs (toggle add/remove) */}
                  <View className="flex-row gap-3 mt-4">
                    <Pressable
                      onPress={() => toggleItemInBag(item.product.sku)}
                      className={`flex-1 rounded-full items-center py-3 active:opacity-90 ${
                        inCart ? "bg-white/10 border border-white/40" : "bg-white"
                      }`}
                    >
                      <Text className={inCart ? "text-white font-semibold" : "text-brand-bg font-semibold"}>
                        {loading ? (inCart ? "Removing…" : "Adding…") : inCart ? "Remove from Bag" : "Add to Bag"}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => toggleHave(item.product.sku)}
                      className="flex-1 rounded-full border border-white/40 bg-white/10 items-center py-3 active:opacity-90"
                    >
                      <Text className="text-white font-semibold">
                        {have ? "Marked as Owned" : "Already have"}
                      </Text>
                    </Pressable>
                  </View>
                </GlassCard>
              );
            })}

            {/* Fallback if no kit */}
            {kit.length === 0 && (
              <GlassCard className="p-5">
                <Text className="text-white/90">
                  We’re preparing a focused 4-item kit for your routine. Check back soon.
                </Text>
              </GlassCard>
            )}
          </View>

          {/* Single Add Kit CTA (20% off) */}
          <Pressable
            onPress={addKitToBag}
            className="w-full rounded-full bg-white items-center py-3 active:opacity-90"
          >
            <Text className="text-brand-bg font-semibold">Add Kit to Bag — 20% off</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/** ----------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------- */
function buildKitFromPlan(plan: FleurPlan | null) {
  // Build a candidate list from model + ensure core products are present.
  const fromModelRaw = plan?.recommendations?.length ? (pickKit(plan.recommendations as any) as any[]) : [];

  // Client-side safety filter: drop oils and any serum/derma-stamp-like items to avoid duplicates/banned cats.
  const fromModel = fromModelRaw.filter((rec) => {
    const text =
      [
        rec?.slot,
        rec?.category,
        rec?.title,
        rec?.name,
        rec?.product?.name,
        rec?.product?.title,
      ]
        .filter(Boolean)
        .join(" ")
        .toString()
        .toLowerCase() || "";

    const isOil = /(^|[^a-z])oil(s)?([^a-z]|$)/i.test(text) || rec?.slot === "oil" || rec?.category === "oil";
    const isSerumOrStamp = /(serum|derma\s*stamp|microneedl)/i.test(text);
    return !isOil && !isSerumOrStamp;
  });

  // Start with core items occupying their target slots
  const bySlot: Partial<Record<Slot, any>> = {
    treat: CORE_PRODUCTS.serum,
    protect: CORE_PRODUCTS.dermaStamp,
  };

  // Compute preferred order (may swap scalp in for treat; we'll still pin cores)
  const order = (preferredKitOrder(plan as any, plan?.recommendations as any) as Slot[]) || [
    "cleanse",
    "condition",
    "treat",
    "protect",
  ];

  // Fill remaining slots from filtered model recs, respecting categorize + not overwriting the cores
  for (const rec of fromModel) {
    const slot = (categorize(rec) as Slot) || "other";
    if (!["cleanse", "condition", "treat", "protect"].includes(slot)) continue;
    if (bySlot[slot]) continue; // skip if core filled it
    bySlot[slot] = rec;
  }

  // If still missing cleanse/condition, scan all recs to backfill with same safety filter
  if (plan?.recommendations?.length) {
    for (const rec of plan.recommendations) {
      const slot = (categorize(rec) as Slot) || "other";
      if (!["cleanse", "condition", "treat", "protect"].includes(slot)) continue;

      // Apply same safety filter
      const text =
        [
          rec?.slot,
          rec?.category,
          rec?.title,
          rec?.name,
          rec?.product?.name,
          rec?.product?.title,
        ]
          .filter(Boolean)
          .join(" ")
          .toString()
          .toLowerCase() || "";

      const isOil = /(^|[^a-z])oil(s)?([^a-z]|$)/i.test(text) || rec?.slot === "oil" || rec?.category === "oil";
      const isSerumOrStamp = /(serum|derma\s*stamp|microneedl)/i.test(text);
      if (isOil || isSerumOrStamp) continue;

      if (!bySlot[slot]) bySlot[slot] = rec;
    }
  }

  // Build ordered array and trim to 4
  const ordered = order
    .map((s) => (bySlot[s] ? { slot: s, ...(bySlot[s] as any) } : null))
    .filter(Boolean) as Array<{ slot: Slot } & any>;

  // Ensure exactly 4 items (fill with any remaining unique recs if needed)
  if (ordered.length < 4 && plan?.recommendations?.length) {
    const have = new Set(ordered.map((x) => x.slot));
    for (const rec of plan.recommendations) {
      const slot = (categorize(rec) as Slot) || "other";
      if (!["cleanse", "condition", "treat", "protect"].includes(slot)) continue;

      // Apply safety filter again
      const text =
        [
          rec?.slot,
          rec?.category,
          rec?.title,
          rec?.name,
          rec?.product?.name,
          rec?.product?.title,
        ]
          .filter(Boolean)
          .join(" ")
          .toString()
          .toLowerCase() || "";

      const isOil = /(^|[^a-z])oil(s)?([^a-z]|$)/i.test(text) || rec?.slot === "oil" || rec?.category === "oil";
      const isSerumOrStamp = /(serum|derma\s*stamp|microneedl)/i.test(text);
      if (isOil || isSerumOrStamp) continue;

      if (!have.has(slot as Slot)) {
        ordered.push({ slot, ...rec } as any);
        have.add(slot as Slot);
      }
      if (ordered.length >= 4) break;
    }
  }

  // Final safeguard: keep cores present even if model data was empty
  const mustHave = new Set<Slot>(["treat", "protect"]);
  const haveSlots = new Set(ordered.map((o) => o.slot));
  for (const s of mustHave) {
    if (!haveSlots.has(s)) {
      ordered.push({ slot: s, ...(s === "treat" ? CORE_PRODUCTS.serum : CORE_PRODUCTS.dermaStamp) } as any);
    }
  }

  return ordered.slice(0, 4);
}

function fitLineForSlot(slot: Slot): string {
  switch (slot) {
    case "cleanse":
      return "Wash days";
    case "condition":
      return "After cleanse / leave-in";
    case "treat":
      return "Daily or weekly focus";
    case "protect":
      return "Tool / styling days";
    default:
      return "Routine";
  }
}

/** ----------------------------------------------------------------
 * UI bits
 * ---------------------------------------------------------------- */
function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <View className={["rounded-2xl overflow-hidden border border-white/20", className].join(" ")}>
      <BlurView intensity={20} tint="light" className="absolute inset-0" />
      <View className="relative">{children}</View>
    </View>
  );
}

function ProductImage({ uri, slot }: { uri?: string; slot: ProductCategory }) {
  const [failed, setFailed] = React.useState(false);
  const fallback = DEFAULT_SLOT_IMAGES[slot] ?? DEFAULT_SLOT_IMAGES.other;
  const source = !uri || failed ? fallback : { uri };

  return (
    <View style={{ width: 80, height: 80 }}>
      <Image
        source={source}
        onError={() => setFailed(true)}
        style={{ width: 80, height: 80, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)" }}
        resizeMode="cover"
      />
      {/* Icon overlay removed by request */}
    </View>
  );
}
