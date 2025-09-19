// src/screens/RewardsScreen.tsx
import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ImageBackground,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import dayjs from "dayjs";

import { useRewardsStore } from "@/state/rewardsStore";

/** Tiers for the progress bar */
const TIERS = [
  { key: "Bronze", cutoff: 0 },
  { key: "Silver", cutoff: 250 },
  { key: "Gold", cutoff: 500 },
  { key: "Platinum", cutoff: 1000 },
];

function getTierInfo(points: number) {
  let current = TIERS[0];
  for (const t of TIERS) if (points >= t.cutoff) current = t;
  const idx = TIERS.findIndex((t) => t.key === current.key);
  const next = TIERS[idx + 1] ?? null;
  const remaining = next ? Math.max(0, next.cutoff - points) : 0;
  const percent = next
    ? Math.min(1, Math.max(0, (points - current.cutoff) / (next.cutoff - current.cutoff)))
    : 1;

  return {
    currentLabel: current.key,
    nextLabel: next?.key ?? "Max",
    remainingLabel: next ? `${remaining} pts to ${next.key}` : "Top tier reached",
    percent,
  };
}

function reasonLabel(reason: string) {
  switch (reason) {
    case "daily_check_in": return "Daily check-in";
    case "start_routine":  return "Started routine";
    case "first_post":     return "First community post";
    case "write_review":   return "Product review";
    case "refer_friend":   return "Referral";
    case "purchase":       return "Purchase";
    case "redeem":         return "Redeemed";
    default:               return reason.replace(/_/g, " ");
  }
}

export default function RewardsScreen() {
  const insets = useSafeAreaInsets();

  const pointsAvailable = useRewardsStore((s) => s.pointsAvailable);
  const ledger = useRewardsStore((s) => s.ledger);

  const tier = React.useMemo(() => getTierInfo(pointsAvailable), [pointsAvailable]);
  const recent = ledger.slice(0, 8);

  // accordion state (details only)
  const [howOpen, setHowOpen] = React.useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: "#120d0a" }}>
      <ImageBackground
        source={require("../../assets/dashboard.png")}
        resizeMode="cover"
        style={StyleSheet.absoluteFillObject as any}
      />
      <StatusBar style="light" />

      <SafeAreaView
        edges={["top", "left", "right"]}
        style={[styles.safe, { paddingBottom: insets.bottom || 12 }]}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Centered header — matches Community */}
          <View style={styles.headerWrap}>
            <Text style={styles.headerTitle}>Rewards</Text>
            <Text style={styles.headerSub}>Earn points & free gifts</Text>
          </View>

          {/* Points glass card */}
          <GlassCard style={styles.card}>
            <View style={styles.pointsTopRow}>
              <View style={{ flexShrink: 1 }}>
                <Text style={styles.pointsLabel}>Points</Text>
                <Text style={styles.pointsValue}>{pointsAvailable}</Text>
              </View>

              <View style={styles.badge}>
                <Text style={styles.badgeText}>{tier.currentLabel}</Text>
              </View>
            </View>

            {/* Progress */}
            <View style={{ marginTop: 14 }}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${tier.percent * 100}%` }]} />
              </View>
              <View style={styles.progressLabels}>
                <Text style={styles.progressLeft}>Progress to {tier.nextLabel}</Text>
                <Text style={styles.progressRight}>{tier.remainingLabel}</Text>
              </View>
            </View>
          </GlassCard>

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
              icon="check-circle"
              title="Daily check-in"
              points="+1"
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
              onPress={() => router.push("/(app)/education")} // placeholder
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
              onPress={() => router.push("/(app)/education")} // placeholder
            />
          </View>

          {/* How to earn (accordion with DETAILS ONLY) */}
          <View style={styles.accordion}>
            <Pressable
              onPress={() => setHowOpen((v) => !v)}
              style={styles.accHeader}
              accessibilityRole="button"
              accessibilityLabel="How to earn points"
            >
              <Text style={styles.accTitle}>How to earn points (details)</Text>
              <Feather name={howOpen ? "chevron-up" : "chevron-down"} size={18} color="#fff" />
            </Pressable>

            {howOpen && (
              <View style={styles.accBody}>
                <Text style={styles.accLead}>
                  Points accrue from activity and purchases. Highlights:
                </Text>
                <View style={styles.rulesWrap}>
                  <Rule line="$1 spent = 1 point" sub="Points post after confirmed orders." />
                  <Rule line="Daily check-in = +1 point" sub="Keep your streak going." />
                  <Rule line="Start your routine = +5" sub="Awarded the first time you set it up." />
                  <Rule line="First community post = +5" sub="Say hi to the community." />
                  <Rule line="Write a review = +5" sub="Share your experience to help others." />
                  <Rule line="Refer a friend = +20" sub="After their first confirmed order." />
                </View>
              </View>
            )}
          </View>

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
                        <Text style={styles.ledgerTitle}>{reasonLabel(ev.reason)}</Text>
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
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/* ------------ components ------------ */

function GlassCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  return (
    <View style={[styles.cardShadow, style]}>
      <View style={styles.cardBodyAlt}>{children}</View>
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
    paddingTop: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800", textAlign: "center" },
  headerSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 4, textAlign: "center" },

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
  pointsLabel: { color: "rgba(255,255,255,0.8)", fontWeight: "600" },
  pointsValue: { color: "#fff", fontSize: 42, fontWeight: "800", marginTop: 2 },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  badgeText: { color: "#fff", fontWeight: "700", fontSize: 12 },

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
});
