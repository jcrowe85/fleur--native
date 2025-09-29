// src/screens/RoutineAnalyticsScreen.tsx
import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Pressable,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

import { useRoutineStore } from "@/state/routineStore";
import { usePurchaseStore } from "@/state/purchaseStore";
import { useRewardsStore } from "@/state/rewardsStore";
import { ScreenScrollView } from "@/components/UI/bottom-space";
import RewardsPill from "@/components/UI/RewardsPill";

const { width } = Dimensions.get('window');

export default function RoutineAnalyticsScreen() {
  const { steps, completedByDate } = useRoutineStore();
  const { purchases } = usePurchaseStore();
  const { points, events } = useRewardsStore();

  // Calculate analytics data
  const analytics = useMemo(() => {
    const totalSteps = (steps || []).length;
    const enabledSteps = (steps || []).filter(step => step.enabled).length;
    const morningSteps = (steps || []).filter(step => step.period === 'morning' && step.enabled).length;
    const eveningSteps = (steps || []).filter(step => step.period === 'evening' && step.enabled).length;
    const weeklySteps = (steps || []).filter(step => step.period === 'weekly' && step.enabled).length;

    // Calculate completion rates
    const totalCompletions = Object.values(completedByDate || {}).reduce((sum, dayCompletions) => 
      sum + Object.values(dayCompletions || {}).filter(Boolean).length, 0
    );
    
    const totalPossibleCompletions = enabledSteps * 30; // Assuming 30 days
    const completionRate = totalPossibleCompletions > 0 ? (totalCompletions / totalPossibleCompletions) * 100 : 0;

    // Calculate streak data
    const today = new Date().toISOString().split('T')[0];
    const dates = Object.keys(completedByDate || {}).sort();
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    for (let i = dates.length - 1; i >= 0; i--) {
      const dayCompletions = (completedByDate || {})[dates[i]];
      const hasCompletions = Object.values(dayCompletions || {}).some(Boolean);
      
      if (hasCompletions) {
        tempStreak++;
        if (dates[i] === today || currentStreak > 0) {
          currentStreak = tempStreak;
        }
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    // Calculate spending analytics
    const totalSpent = (purchases || []).reduce((sum, purchase) => sum + (purchase.priceCents / 100), 0);
    const totalProducts = (purchases || []).length;
    const averageOrderValue = totalProducts > 0 ? totalSpent / totalProducts : 0;

    // Calculate points analytics
    const totalPointsEarned = (events || []).reduce((sum, event) => 
      event.reason === 'earn' ? sum + event.points : sum, 0
    );
    const totalPointsRedeemed = (events || []).reduce((sum, event) => 
      event.reason === 'redeem' ? sum + event.points : sum, 0
    );

    return {
      totalSteps,
      enabledSteps,
      morningSteps,
      eveningSteps,
      weeklySteps,
      completionRate: Math.round(completionRate),
      currentStreak,
      longestStreak,
      totalCompletions,
      totalSpent: Math.round(totalSpent * 100) / 100,
      totalProducts,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      totalPointsEarned,
      totalPointsRedeemed,
      currentPoints: points,
    };
  }, [steps, completedByDate, purchases, points, events]);

  const onBack = () => {
    try {
      router.canGoBack() ? router.back() : router.replace("/(app)/routine");
    } catch {
      router.replace("/(app)/routine");
    }
  };

  const StatCard = ({ title, value, subtitle, icon, color = "#fff" }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: string;
    color?: string;
  }) => (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <Feather name={icon as any} size={20} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const ProgressBar = ({ percentage, color = "#fff" }: { percentage: number; color?: string }) => (
    <View style={styles.progressBarContainer}>
      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${Math.min(percentage, 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.progressText}>{percentage}%</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require("../../assets/dashboard.png")}
        resizeMode="cover"
        style={StyleSheet.absoluteFillObject as any}
      />
      <StatusBar style="light" />

      <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
        {/* Header */}
        <View style={styles.headerWrap}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 16, position: "relative" }}>
            <Pressable onPress={onBack} style={styles.backButton}>
              <Feather name="arrow-left" size={20} color="#fff" />
            </Pressable>
            
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={styles.headerTitle}>Progress Analytics</Text>
              <Text style={styles.headerSub}>Your hair care journey insights</Text>
            </View>

            <View style={[styles.rewardsPillContainer, { padding: 8, borderRadius: 20 }]}>
              <RewardsPill compact />
            </View>
          </View>
        </View>

        <ScreenScrollView contentContainerStyle={styles.content} bottomExtra={20}>
          {/* Routine Overview */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Routine Overview</Text>
            <View style={styles.statsGrid}>
              <StatCard
                title="Total Steps"
                value={analytics.totalSteps}
                subtitle={`${analytics.enabledSteps} active`}
                icon="list"
              />
              <StatCard
                title="Morning Steps"
                value={analytics.morningSteps}
                icon="sunrise"
                color="#fff"
              />
              <StatCard
                title="Evening Steps"
                value={analytics.eveningSteps}
                icon="moon"
                color="#fff"
              />
              <StatCard
                title="Weekly Steps"
                value={analytics.weeklySteps}
                icon="calendar"
                color="#fff"
              />
            </View>
          </View>

          {/* Completion Analytics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completion Analytics</Text>
            <View style={styles.completionCard}>
            <View style={styles.completionHeader}>
              <Feather name="target" size={24} color="#fff" />
              <Text style={styles.completionTitle}>Overall Completion Rate</Text>
            </View>
            <ProgressBar percentage={analytics.completionRate} color="#fff" />
              <Text style={styles.completionSubtext}>
                {analytics.totalCompletions} completions across all steps
              </Text>
            </View>

            <View style={styles.statsGrid}>
              <StatCard
                title="Current Streak"
                value={`${analytics.currentStreak} days`}
                subtitle="Keep it up!"
                icon="zap"
                color="#fff"
              />
              <StatCard
                title="Longest Streak"
                value={`${analytics.longestStreak} days`}
                subtitle="Personal best"
                icon="trophy"
                color="#fff"
              />
            </View>
          </View>

          {/* Spending Analytics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Spending Analytics</Text>
            <View style={styles.statsGrid}>
              <StatCard
                title="Total Spent"
                value={`$${analytics.totalSpent}`}
                subtitle="All time"
                icon="dollar-sign"
                color="#fff"
              />
              <StatCard
                title="Products Bought"
                value={analytics.totalProducts}
                subtitle="Items purchased"
                icon="shopping-bag"
                color="#fff"
              />
              <StatCard
                title="Avg Order Value"
                value={`$${analytics.averageOrderValue}`}
                subtitle="Per purchase"
                icon="trending-up"
                color="#fff"
              />
            </View>
          </View>

          {/* Rewards Analytics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rewards Analytics</Text>
            <View style={styles.statsGrid}>
              <StatCard
                title="Current Points"
                value={analytics.currentPoints}
                subtitle="Available to redeem"
                icon="star"
                color="#fff"
              />
              <StatCard
                title="Points Earned"
                value={analytics.totalPointsEarned}
                subtitle="All time"
                icon="plus-circle"
                color="#fff"
              />
              <StatCard
                title="Points Redeemed"
                value={analytics.totalPointsRedeemed}
                subtitle="Spent on rewards"
                icon="minus-circle"
                color="#fff"
              />
            </View>
          </View>

          {/* Insights */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Insights & Tips</Text>
            <View style={styles.insightsCard}>
              <Feather name="lightbulb" size={20} color="#fff" />
              <View style={styles.insightsContent}>
                <Text style={styles.insightsTitle}>Keep Going!</Text>
                <Text style={styles.insightsText}>
                  {analytics.completionRate >= 80 
                    ? "Excellent consistency! You're maintaining a great routine."
                    : analytics.completionRate >= 60
                    ? "Good progress! Try to complete a few more steps each week."
                    : "Every step counts! Focus on building one habit at a time."
                  }
                </Text>
              </View>
            </View>

            {analytics.currentStreak > 0 && (
              <View style={styles.insightsCard}>
                <Feather name="flame" size={20} color="#fff" />
                <View style={styles.insightsContent}>
                  <Text style={styles.insightsTitle}>Streak Alert!</Text>
                  <Text style={styles.insightsText}>
                    You're on a {analytics.currentStreak}-day streak! Don't break it now.
                  </Text>
                </View>
              </View>
            )}

            {analytics.totalSpent > 0 && (
              <View style={styles.insightsCard}>
                <Feather name="trending-up" size={20} color="#fff" />
                <View style={styles.insightsContent}>
                  <Text style={styles.insightsTitle}>Investment in Hair Health</Text>
                  <Text style={styles.insightsText}>
                    You've invested ${analytics.totalSpent} in your hair care journey. 
                    {analytics.totalPointsEarned > 0 && ` You've also earned ${analytics.totalPointsEarned} points!`}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </ScreenScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#120d0a",
  },
  safeArea: {
    flex: 1,
  },
  headerWrap: {
    paddingTop: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  headerTitle: { 
    color: "#fff", 
    fontSize: 22, 
    fontWeight: "600", 
    textAlign: "center" 
  },
  headerSub: { 
    color: "rgba(255,255,255,0.85)", 
    fontSize: 12, 
    marginTop: 4, 
    textAlign: "center" 
  },
  backButton: {
    position: "absolute",
    left: 0,
    zIndex: 1,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  rewardsPillContainer: {
    position: "absolute",
    right: 16,
    top: -24,
  },
  content: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 60) / 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    marginLeft: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
  },
  completionCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    marginBottom: 16,
  },
  completionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  completionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginLeft: 12,
  },
  progressBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 4,
    marginRight: 12,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    minWidth: 40,
    textAlign: "right",
  },
  completionSubtext: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  insightsCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 12,
  },
  insightsContent: {
    flex: 1,
    marginLeft: 12,
  },
  insightsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  insightsText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 18,
  },
});
