// app/recommendations.tsx
import React, { useMemo, useState } from "react";
import { View, Text, Image, ImageBackground, ScrollView, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

import { CustomButton } from "@/components/UI/CustomButton";
import { usePlanStore } from "@/state/planStore";
import type { FleurPlan } from "@/types/plans";

import {
  categorize,
  labelForSlot as libLabelForSlot,
  iconForSlot as libIconForSlot,
  preferredKitOrder,
  ProductCategory,
} from "@/lib/products";

// 🔹 shared cart store (now with addBySku)
import { useCartStore } from "@/state/cartStore";

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
      imageUrl: undefined,
    },
    title: "Daily follicle support",
    why: "Lightweight peptide blend for stronger, fuller-looking hair.",
  },
  dermaStamp: {
    // keep slot 'protect' for 1-per-slot layout; label will read "Treat"
    slot: "protect" as const,
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
  if (slot === "treat") badges.push("Daily PM");
  if (slot === "condition") badges.push("2×/wk");
  if (slot === "cleanse") badges.push("Wash days");
  if (slot === "protect") badges.push("1–2×/wk");

  if (sku === "fleur-serum") {
    badges.splice(0, badges.length, "Daily PM", "Dry/clean scalp");
  }
  if (sku === "fleur-derma-stamp") {
    badges.splice(0, badges.length, "1–2×/wk", "Patch test");
  }

  const heatOften =
    (plan as any)?.profile?.heatUse === true ||
    /heat/i.test((plan?.summary?.drivers || []).map((d: any) => d?.label).join(" "));
  if (heatOften && slot === "protect" && !badges.includes("Heat care")) {
    badges.push("Heat care");
  }

  return badges.slice(0, 3);
}

/** Localized slot label/icon: show stamp as Treat visually */
function slotLabelFor(item: { slot: Slot; product?: { sku?: string } }): string {
  if (item?.product?.sku === "fleur-derma-stamp") return "Treat";
  return libLabelForSlot(item.slot);
}
function slotIconFor(item: { slot: Slot; product?: { sku?: string } }): any {
  if (item?.product?.sku === "fleur-derma-stamp") return libIconForSlot("treat" as Slot);
  return libIconForSlot(item.slot);
}

/** Enforce canonical order so serum always renders */
function coerceOrder(base: Slot[] | null | undefined): Slot[] {
  const canonical: Slot[] = ["cleanse", "condition", "treat", "protect"];
  if (!Array.isArray(base) || base.length === 0) return canonical;
  const seen = new Set<string>();
  const cleaned = base.filter((s): s is Slot => {
    if (!["cleanse", "condition", "treat", "protect"].includes(String(s))) return false;
    if (seen.has(String(s))) return false;
    seen.add(String(s));
    return true;
  });
  const withPinned = Array.from(new Set<Slot>([..."cleanse,condition,treat,protect".split(",") as any]))
    .filter((s) => cleaned.includes(s))
    .concat(canonical.filter((s) => !cleaned.includes(s)));
  return canonical.filter((s) => withPinned.includes(s));
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

  // 🔹 Cart store (shared)
  const { items: cartItems, addBySku, remove, addSkusQuick } = useCartStore();

  // For the “Owned” toggle only (local)
  const [alreadyHave, setAlreadyHave] = useState<Set<string>>(new Set());
  const toggleHave = (sku: string) => {
    setAlreadyHave((prev) => {
      const next = new Set(prev);
      next.has(sku) ? next.delete(sku) : next.add(sku);
      return next;
    });
  };

  const cartQty = useMemo(() => cartItems.reduce((sum, it) => sum + it.qty, 0), [cartItems]);
  const inCartSet = useMemo(() => new Set(cartItems.map((it) => it.sku)), [cartItems]);

  // 🔹 Add whole kit to cart & go to cart
  const addKitToBag = () => {
    const skus = kit.map((k) => k.product.sku).filter(Boolean);
    if (skus.length === 0) return;
    addSkusQuick(skus);
    router.push("/cart?returnTo=/(plan)/recommendations");
  };

  // 🔹 Per-item add/remove (now using addBySku to guarantee price/variant)
  const toggleItemInBag = (sku: string) => {
    if (inCartSet.has(sku)) {
      remove(sku);
    } else {
      addBySku(sku, 1);
    }
  };

  const goCart = () => router.push("/cart?returnTo=/(plan)/recommendations");
  const goDashboard = () => router.replace("/dashboard");

  return (
    <View className="flex-1 bg-brand-bg">
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <ImageBackground
        source={require("../../../assets/dashboard.png")}
        resizeMode="cover"
        className="absolute inset-0"
      >
      </ImageBackground>

      <SafeAreaView className="flex-1" edges={["top", "left", "right"]}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-2 pb-3">
          <Pressable onPress={() => router.back()} className="p-2 rounded-full active:opacity-80" hitSlop={8}>
            <Feather name="arrow-right" size={22} color="#fff" style={{ transform: [{ scaleX: -1 }] }} />
          </Pressable>

          <View style={{ flex: 1, alignItems: "center" }}>
            <Text className="text-white text-[20px] font-semibold">Your Kit</Text>
            <Text className="text-white/80 text-xs mt-1">Matched to your Routine</Text>
          </View>

          <Pressable onPress={goCart} hitSlop={8} className="p-2 rounded-full active:opacity-80" style={{ position: "relative" }}>
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

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 6,
            paddingBottom: insets.bottom + 28,
          }}
        >
          {/* Kit cards */}
          <View className="gap-4 mb-6">
            {kit.map((item) => {
              const slot = item.slot as Slot;
              const have = alreadyHave.has(item.product.sku);
              const inCart = inCartSet.has(item.product.sku);
              const headerBadges = badgesFor(slot, item.product.sku, plan);

              return (
                <GlassCard key={item.product.sku || `${item.slot}-${item.title}`} className="p-5">
                  {/* Header */}
                  <View className="flex-row items-center mb-3">
                    <View className="p-1.5 rounded-full bg-white/15 mr-2">
                      <Feather name={slotIconFor(item)} size={16} color="#fff" />
                    </View>
                    <Text className="text-white font-semibold" numberOfLines={1} ellipsizeMode="tail">
                      {slotLabelFor(item)}
                    </Text>
                    <View style={{ flexDirection: "row", flexShrink: 1, minWidth: 0, marginLeft: 8 }}>
                      {headerBadges.map((b) => (
                        <Badge key={b} label={b} />
                      ))}
                    </View>
                  </View>

                  {/* Image + body */}
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

                  {/* CTAs per item */}
                  <View className="flex-row gap-3 mt-4">
                    <Pressable
                      onPress={() => toggleItemInBag(item.product.sku)}
                      className={`flex-1 rounded-full items-center py-3 active:opacity-90 ${
                        inCart ? "bg-white/10 border border-white/40" : "bg-white"
                      }`}
                    >
                      <Text className={inCart ? "text-white font-semibold" : "text-brand-bg font-semibold"}>
                        {inCart ? "Remove from Bag" : "Add to Bag"}
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
          </View>

          {/* Bottom CTA stack — adapts to whether the bag is empty */}
          <View className="gap-3">
            {cartQty > 0 ? (
              <>
                <Pressable
                  onPress={goCart}
                  className="rounded-full bg-white items-center py-4 active:opacity-90"
                >
                  <View className="flex-row items-center">
                    <Text className="text-brand-bg font-semibold">Go to Bag</Text>
                    <Feather name="arrow-right" size={18} color="#0b0b0b" style={{ marginLeft: 10 }} />
                  </View>
                </Pressable>

                <Pressable
                  onPress={addKitToBag}
                  className="rounded-full border border-white/35 bg-white/10 items-center py-4 active:opacity-90"
                >
                  <Text className="text-white font-semibold">Add Kit — 20% off</Text>
                </Pressable>

                <Pressable onPress={goDashboard} className="items-center mt-1">
                  <Text className="text-white/70 text-xs underline">Continue without kit</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  onPress={goDashboard}
                  className="rounded-full bg-white items-center py-4 active:opacity-90"
                >
                  <View className="flex-row items-center">
                    <Text className="text-brand-bg font-semibold">Continue to Dashboard</Text>
                    <Feather name="arrow-right" size={18} color="#0b0b0b" style={{ marginLeft: 10 }} />
                  </View>
                </Pressable>

                <Pressable
                  onPress={addKitToBag}
                  className="rounded-full border border-white/35 bg-white/10 items-center py-4 active:opacity-90"
                >
                  <Text className="text-white font-semibold">Add Kit — 20% off</Text>
                </Pressable>

                <Pressable onPress={goCart} className="items-center mt-1">
                  <Text className="text-white/70 text-xs underline">Review bag (0)</Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/** ----------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------- */
function buildKitFromPlan(plan: FleurPlan | null) {
  // Always pin these 2 core items
  const bySlot: Partial<Record<Slot, any>> = {
    treat: CORE_PRODUCTS.serum,
    protect: CORE_PRODUCTS.dermaStamp,
  };

  // Gather candidates from model recs
  const all = Array.isArray(plan?.recommendations) ? (plan!.recommendations as any[]) : [];

  // Safety filter + dedupe + remove serum/stamp to avoid duplicates
  const seen = new Set<string>();
  const candidates = all.filter((rec) => {
    const text = [
      rec?.slot,
      rec?.category,
      rec?.title,
      rec?.name,
      rec?.product?.name,
      rec?.product?.title,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const isOil =
      /(^|[^a-z])oil(s)?([^a-z]|$)/i.test(text) ||
      rec?.slot === "oil" ||
      rec?.category === "oil";
    if (isOil) return false;

    // drop any serum/stamp-like items (we pin our own)
    if (/\b(serum|peptide)\b/i.test(text)) return false;
    if (/\b(derma\s*stamp|microneedl)\b/i.test(text)) return false;

    const key = (rec?.product?.sku || rec?.product?.name || rec?.title || "").toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Score candidates based on likely usefulness + hints in summary drivers/wins
  const driverText = (plan?.summary?.drivers || [])
    .map((d: any) => `${d?.label || ""}`.toLowerCase())
    .join(" ");
  const winsText = (plan?.summary?.quickWins || []).join(" ").toLowerCase();

  const isHeat = /heat/.test(driverText) || /heat/.test(winsText);
  const isColor = /color/.test(driverText) || /bond|mask/.test(winsText);
  const isScalpOily = /oily/.test(driverText) || /scalp/.test(winsText);
  const isHardWater = /hard water/.test(driverText) || /clarify|chelate/.test(winsText);

  const score = (rec: any) => {
    const t = [rec?.title, rec?.product?.name].filter(Boolean).join(" ").toLowerCase();
    const slot = (categorize(rec) as ProductCategory) || "other";

    // base category scores
    let s = 0;
    if (/mask|bond|repair/.test(t) || slot === "treat") s = Math.max(s, 80); // treatment mask
    if (/protect|heat/.test(t) || (slot === "protect" && !/stamp/.test(t))) s = Math.max(s, 70); // heat protectant
    if (/cleanse|sham/.test(t) || slot === "cleanse") s = Math.max(s, 60);
    if (/condition|leave/.test(t) || slot === "condition") s = Math.max(s, 55);

    // context boosts
    if (isHeat && (/protect|heat/.test(t) || slot === "protect")) s += 20;
    if (isColor && (/mask|bond|repair/.test(t) || slot === "treat")) s += 15;
    if (isScalpOily && (/cleanse|balanc|clarif|scalp/.test(t) || slot === "cleanse")) s += 10;
    if (isHardWater && (/clarif|chelate/.test(t) || slot === "cleanse")) s += 10;

    return s;
  };

  const ordered = candidates.sort((a, b) => score(b) - score(a));

  // Prefer cleanse + condition as the 2 non-core items
  if (!bySlot.cleanse || !bySlot.condition) {
    for (const rec of ordered) {
      const slot = (categorize(rec) as Slot) || "other";
      if (!["cleanse", "condition"].includes(slot)) continue;
      if (!bySlot[slot]) bySlot[slot] = rec;
      if (bySlot.cleanse && bySlot.condition) break;
    }
  }

  // Backfill generics if missing so we ALWAYS render 4
  if (!bySlot.cleanse) bySlot.cleanse = makeGenericCleanser();
  if (!bySlot.condition) bySlot.condition = makeGenericConditioner();

  // Assemble final 4 in enforced order
  const suggestedOrder = preferredKitOrder(plan as any, plan?.recommendations as any) as Slot[] | undefined;
  const order = coerceOrder(suggestedOrder);
  const kit = order
    .map((s) => (bySlot[s] ? { slot: s, ...(bySlot[s] as any) } : null))
    .filter(Boolean) as Array<{ slot: Slot } & any>;

  return kit.slice(0, 4);
}

function makeGenericCleanser() {
  return {
    slot: "cleanse" as const,
    product: { sku: "fleur-cleanser-generic", name: "Gentle Cleanser", imageUrl: undefined },
    title: "Low-stripping wash",
    why: "Cleanses without over-drying; balances scalp on wash days.",
  };
}

function makeGenericConditioner() {
  return {
    slot: "condition" as const,
    product: { sku: "fleur-conditioner-generic", name: "Lightweight Conditioner", imageUrl: undefined },
    title: "Daily slip & softness",
    why: "Detangles and softens mid→ends without weighing roots down.",
  };
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
    </View>
  );
}
