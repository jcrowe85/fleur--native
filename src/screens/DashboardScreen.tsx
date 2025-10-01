// src/screens/DashboardScreen.tsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  ImageBackground,
  Pressable,
  Animated,
  Easing,
  StyleSheet,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Svg, { Path, Circle, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import dayjs from "dayjs";

import { useRoutineStore, RoutineStep } from "@/state/routineStore";
import { useRewardsStore } from "@/state/rewardsStore";
import { useCheckInStore } from "@/state/checkinStore";
import { useAuthStore } from "@/state/authStore";
import { getAllProducts, getProductPointValue } from "@/data/productPointCatalog";
import PointsContainer from "@/components/UI/PointsContainer";
import { onRoutineTaskCompleted, onRoutineTaskUndone } from "@/services/rewards";
import { checkFirstLogin, markFirstLoginComplete, retryMarkFirstLoginComplete } from "@/services/firstTimeUser";
import { ScreenScrollView } from "@/components/UI/bottom-space"; // ✅ unified bottom-spacing helper

// ⭐ Small Rewards Pill (compact variant supported)
import RewardsPill from "@/components/UI/RewardsPill";
import DailyCheckInPopup from "@/components/DailyCheckInPopup";
import FirstPointPopup from "@/components/FirstPointPopup";
import SignupBonusPopup from "@/components/SignupBonusPopup";

/* ------------------------------- product progress math ------------------------------- */

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
  const allProducts = getAllProducts().sort((a, b) => a.pointsRequired - b.pointsRequired);
  const nextProduct = allProducts.find(product => product.pointsRequired > points);
  const pointsNeeded = nextProduct ? nextProduct.pointsRequired - points : 0;
  
  if (!nextProduct) {
    // User can afford all products
    return {
      currentLabel: "All Products",
      nextLabel: "Unlocked",
      remainingLabel: "All products available!",
      remainingPoints: 0,
      percent: 1,
    };
  }

  // Calculate progress towards the next product
  const currentProductIndex = allProducts.findIndex(p => p.pointsRequired > points);
  
  // Calculate progress from 0 to the next product (not between previous and next)
  const percent = Math.min(1, points / nextProduct.pointsRequired);
  
  if (currentProductIndex === 0) {
    // User hasn't reached the first product yet
    const abbreviatedName = abbreviateProductName(nextProduct.name);
    return {
      currentLabel: "Getting Started",
      nextLabel: nextProduct.name,
      remainingLabel: `Next unlock in ${pointsNeeded} pts`,
      remainingPoints: pointsNeeded,
      percent,
    };
  }

  // User is between products
  const previousProduct = allProducts[currentProductIndex - 1];
  return {
    currentLabel: previousProduct.name,
    nextLabel: nextProduct.name,
    remainingLabel: `Next unlock in ${pointsNeeded} pts`,
    remainingPoints: pointsNeeded,
    percent,
  };
}

/* ---------------------------- chart subcomponent ---------------------------- */

function RecoveryChart({
  weeks,
  curve,
  durationMs = 24000,
  loop = true,
}: {
  weeks: number;
  curve: { plateauAt: number };
  durationMs?: number;
  loop?: boolean;
}) {
  const width = 340;
  const height = 140;
  const pad = 12;

  const pts = useMemo(() => {
    const out: { x: number; y: number; t: number }[] = [];
    for (let i = 0; i <= weeks; i++) {
      const t = i / weeks;
      const y = curve.plateauAt * (1 / (1 + Math.exp(-(t * 8 - 4))));
      out.push({ x: t, y, t });
    }
    return out;
  }, [weeks, curve.plateauAt]);

  const px = (t: number) => pad + t * (width - pad * 2);
  const py = (y: number) => height - pad - y * (height - pad * 2);

  const pathLine = useMemo(
    () => pts.map((p, i) => `${i === 0 ? "M" : "L"}${px(p.x)},${py(p.y)}`).join(" "),
    [pts]
  );
  const pathArea = useMemo(
    () => `${pathLine} L${width - pad},${height - pad} L${pad},${height - pad} Z`,
    [pathLine]
  );

  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const play = () =>
      Animated.timing(progress, {
        toValue: 1,
        duration: durationMs,
        easing: Easing.linear,
        useNativeDriver: false,
      });

    if (loop) {
      const seq = Animated.sequence([
        Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: false }),
        play(),
      ]);
      const looper = Animated.loop(seq);
      looper.start();
      return () => looper.stop();
    } else {
      play().start();
    }
  }, [durationMs, loop, progress]);

  const inputRange = pts.map((p) => p.t);
  const cx = progress.interpolate({ inputRange, outputRange: pts.map((p) => px(p.x)) });
  const cy = progress.interpolate({ inputRange, outputRange: pts.map((p) => py(p.y)) });

  const AnimatedCircleAny = Animated.createAnimatedComponent(Circle) as any;

  const milestones = [0, 4, 8, 12].map((week) => ({
    threshold: week / weeks,
    label:
      week === 0
        ? "Getting started"
        : week === 4
        ? "Consistency taking hold"
        : week === 8
        ? "Scalp feel improving"
        : "Visible progress",
  }));

  const CENTER_X = pad + (width - pad * 2) / 2;
  const CAP_W = 200;
  const CAP_TOP = 8;

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={width} height={height}>
        <Defs>
          <SvgGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="white" stopOpacity={0.22} />
            <Stop offset="1" stopColor="white" stopOpacity={0.04} />
          </SvgGradient>
          <SvgGradient id="stroke" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="white" stopOpacity={0.95} />
            <Stop offset="1" stopColor="white" stopOpacity={0.5} />
          </SvgGradient>
        </Defs>

        {/* baseline */}
        <Path
          d={`M${pad},${height - pad} L${width - pad},${height - pad}`}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={1}
        />

        {/* curve */}
        <Path d={pathArea} fill="url(#area)" />
        <Path d={pathLine} stroke="url(#stroke)" strokeWidth={2} fill="none" />

        {/* dot glow + dot */}
        <AnimatedCircleAny cx={cx} cy={cy} r={10} fill="rgba(255,255,255,0.10)" />
        <AnimatedCircleAny cx={cx} cy={cy} r={4} fill="#fff" />
      </Svg>

      {/* captions */}
      {milestones.map((m, i) => {
        const opacity = progress.interpolate({
          inputRange: [m.threshold - 0.02, m.threshold, m.threshold + 0.22],
          outputRange: [0, 1, 0],
          extrapolate: "clamp",
        });
        const dy = progress.interpolate({
          inputRange: [m.threshold - 0.02, m.threshold, m.threshold + 0.22],
          outputRange: [0, 12, 12],
          extrapolate: "clamp",
        });

        return (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={{
              position: "absolute",
              top: CAP_TOP,
              left: CENTER_X - CAP_W / 2,
              width: CAP_W,
              opacity,
              transform: [{ translateY: dy as any }],
            }}
          >
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600", textAlign: "center" }}>
              {m.label}
            </Text>
          </Animated.View>
        );
      })}

      {/* x-axis labels */}
      <View
        style={{
          marginTop: 6,
          width,
          paddingHorizontal: 8,
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <Text style={styles.axisLabel}>Week 0</Text>
        <Text style={styles.axisLabel}>Week {weeks}</Text>
      </View>
    </View>
  );
}

/* --------------------------------- screen --------------------------------- */

export default function DashboardScreen() {
  // Routine store
  const stepsByPeriod = useRoutineStore((s) => s.stepsByPeriod);
  const isCompletedToday = useRoutineStore((s) => s.isCompletedToday);
  const toggleStepToday = useRoutineStore((s) => s.toggleStepToday);
  const completedByDate = useRoutineStore((s) => s.completedByDate);
  const stepsAll = useRoutineStore((s) => s.steps); // subscribe to steps
  const applyDefaultIfEmpty = useRoutineStore((s) => s.applyDefaultIfEmpty);

  // Daily check-in popup
  const [showDailyCheckInPopup, setShowDailyCheckInPopup] = useState(false);
  
  // Simple text cycling animation
  const [currentText, setCurrentText] = useState("Points");
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const cycleText = () => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        // Change text when fade out completes
        setCurrentText(prev => prev === "Points" ? "Needed" : "Points");
        
        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
    };
    
    // Start the cycle after initial delay
    timeoutId = setTimeout(() => {
      cycleText();
      
      // Set up interval for subsequent cycles
      const interval = setInterval(cycleText, 4000);
      
      // Cleanup function
      return () => clearInterval(interval);
    }, 2000);
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);
  
  // First point popup
  const [showFirstPointPopup, setShowFirstPointPopup] = useState(false);
  
  // Signup bonus popup
  const [showSignupBonusPopup, setShowSignupBonusPopup] = useState(false);
  
  // Ref to store timeout ID for cleanup
  const dailyCheckInTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const firstPointTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ensure defaults exist when dashboard is the first screen opened
  useEffect(() => {
    applyDefaultIfEmpty();
  }, [applyDefaultIfEmpty]);

  // Rewards store
  const points = useRewardsStore((s) => s.pointsAvailable);
  const pointsTotal = useRewardsStore((s) => s.pointsTotal);
  const streakDays = useRewardsStore((s) => s.streakDays);
  const hasCheckedInToday = useRewardsStore((s) => s.hasCheckedInToday);
  const ledger = useRewardsStore((s) => s.ledger);

  // Check-in popup logic - SIMPLIFIED
  const shouldShowDailyPopup = useCheckInStore((s) => s.shouldShowDailyPopup);
  const markPopupShown = useCheckInStore((s) => s.markPopupShown);
  
  // Signup bonus logic - SIMPLIFIED
  const awardSignupBonus = useRewardsStore((s) => s.awardSignupBonus);

  // Set up callbacks - run once on mount
  useEffect(() => {
    const { setFirstPointCallback, setSignupBonusCallback } = useRewardsStore.getState();
    
    // Create a new callback that will show the popup
    const dashboardCallback = () => {
      // Try immediate state update first
      setShowFirstPointPopup(true);
      
      // Also try with a small delay as backup
      firstPointTimeoutRef.current = setTimeout(() => {
        setShowFirstPointPopup(true);
        firstPointTimeoutRef.current = null;
      }, 500); // Short backup delay
    };
    
    setFirstPointCallback(dashboardCallback);
    setSignupBonusCallback(() => setShowSignupBonusPopup(true));
  }, []);


  // Check for first login and show signup bonus - SIMPLE APPROACH
  useEffect(() => {
    const checkAndShowSignupBonus = async () => {
      try {
        // Wait a bit for session to be established
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { user } = useAuthStore.getState();
        
        const firstLoginData = await checkFirstLogin();
        // Check rewards store state
        const { grants } = useRewardsStore.getState();
        
        if (firstLoginData.isFirstLogin) {
          // Award signup bonus and show popup
          const success = awardSignupBonus();
          if (success) {
            // Mark in database that first login is complete (with retry logic)
            const markComplete = async () => {
              // First try immediate marking
              const result = await markFirstLoginComplete();
              if (result) {
                return;
              }
              
              // If immediate marking failed (no session), retry when session is ready
              const retryResult = await retryMarkFirstLoginComplete();
            };
            
            // Try to mark complete, but don't block the popup
            markComplete().catch(() => {});
            
            // Show popup after small delay
            setTimeout(() => {
              setShowSignupBonusPopup(true);
            }, 100);
          }
        }
      } catch (error) {
        console.error('Error checking first login status:', error);
      }
    };

    checkAndShowSignupBonus();
  }, []); // Run only once on mount

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (dailyCheckInTimeoutRef.current) {
        clearTimeout(dailyCheckInTimeoutRef.current);
        dailyCheckInTimeoutRef.current = null;
      }
      if (firstPointTimeoutRef.current) {
        clearTimeout(firstPointTimeoutRef.current);
        firstPointTimeoutRef.current = null;
      }
    };
  }, []);

  // Today’s routine (AM + PM) — recompute whenever steps change
  const todaysSteps = useMemo(
    () => [...stepsByPeriod("morning"), ...stepsByPeriod("evening")],
    [stepsByPeriod, stepsAll]
  );
  const totalToday = todaysSteps.length;
  const doneToday = todaysSteps.filter((s) => isCompletedToday(s.id)).length;

  // Weekly completion
  const weekStart = dayjs().startOf("week");
  const days = Array.from({ length: 7 }, (_, i) => weekStart.add(i, "day").format("YYYY-MM-DD"));
  const expectedTotal = todaysSteps.length * 7;
  const dailyIds = new Set(todaysSteps.map((s) => s.id));
  const actualTotal = days.reduce((acc, iso) => {
    const map = completedByDate[iso] || {};
    const completedIds = Object.keys(map).filter((id) => dailyIds.has(id)).length;
    return acc + completedIds;
  }, 0);
  const weeklyPct = expectedTotal > 0 ? Math.round((actualTotal / expectedTotal) * 100) : 0;

  // Total steps completed (all time)
  const totalStepsCompleted = useMemo(() => {
    return Object.values(completedByDate).reduce((acc, dayCompletions) => {
      return acc + Object.keys(dayCompletions).length;
    }, 0);
  }, [completedByDate]);

  // Rewards progress (product-based)
  const progress = getProductProgressInfo(points);
  const allProducts = getAllProducts();
  const affordableProducts = allProducts.filter(product => points >= product.pointsRequired);

  // Toggle handler for routine tasks (awards points for task completion)
  function onToggle(step: RoutineStep) {
    const wasCompleted = isCompletedToday(step.id);
    const nowCompleted = toggleStepToday(step.id);

    if (nowCompleted && !wasCompleted) {
      // Task was just completed - award points
      const res = onRoutineTaskCompleted(step.id);
      if (res?.ok) {
        // Points awarded for task completion
      }
    } else if (!nowCompleted && wasCompleted) {
      // Task was just undone - remove points
      const res = onRoutineTaskUndone(step.id);
      if (res?.ok) {
        // Points removed for task undo
      }
    }
  }

  // 14-day check-ins sparkline (from rewards ledger)
  const checkinsSet = useMemo(() => {
    const set = new Set<string>();
    ledger
      .filter((l) => l.reason === "daily_check_in")
      .forEach((l) => set.add(dayjs(l.ts).format("YYYY-MM-DD")));
    return set;
  }, [ledger]);
  const last14 = Array.from({ length: 14 }, (_, i) => dayjs().subtract(13 - i, "day"));
  const checkinBars = last14.map((d) => (checkinsSet.has(d.format("YYYY-MM-DD")) ? 1 : 0));

  return (
    <View style={{ flex: 1, backgroundColor: "#120d0a" }}>
      <ImageBackground
        source={require("../../assets/dashboard.png")}
        resizeMode="cover"
        style={StyleSheet.absoluteFillObject as any}
      />
      

      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        {/* Header */}
         <View style={styles.headerWrap}>
           <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 16, position: "relative" }}>
          <View style={{ flex: 1, alignItems: "center" }}>
               <Text style={styles.headerTitle}>Your Hair Journey</Text>
               <Text style={styles.headerSub}>Your routine, progress, and rewards in one place.</Text>
          </View>

             <View style={[styles.rewardsPillContainer, { padding: 8, borderRadius: 20 }]}>
            <RewardsPill compact />
             </View>


          </View>
        </View>

        <ScreenScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6 }}
          bottomExtra={16} // ✅ tab bar + safe-area + a little cushion (same convention)
          showsVerticalScrollIndicator={false}
        >

          {/* Points Display Block */}
          <PointsContainer 
            points={points} 
            onRedeemPress={() => router.push("/(app)/rewards")}
          />

          {/* Progress + Rewards snapshot (above Today's Routine) */}
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
            <GlassCard style={{ flex: 1, padding: 14, minHeight: 140 }}>
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.iconDot}>
                  <Feather name="activity" size={14} color="#fff" />
                </View>
                <Text style={styles.sectionHeaderText}>Your Progress</Text>
              </View>

              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                <StatTile big={String(streakDays)} caption="Streak" />
                <StatTile big={`${weeklyPct}%`} caption="This Week" />
              </View>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <StatTile big={String(totalStepsCompleted)} caption="Total Steps" />
                <StatTile big={String(pointsTotal)} caption="Points" />
              </View>
            </GlassCard>

            <GlassCard style={{ flex: 1, padding: 14, minHeight: 140 }}>
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.iconDot}>
                  <Feather name="lock" size={14} color="#fff" />
                </View>
                <Text style={styles.sectionHeaderText}>Next Unlock</Text>
              </View>

              <View
                style={{
                  marginTop: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View>
                  <Animated.Text 
                    style={{ 
                      color: "rgba(255,255,255,0.85)", 
                      fontWeight: "600",
                      opacity: fadeAnim
                    }}
                  >
                    {currentText}
                  </Animated.Text>
                  <Text style={{ color: "#fff", fontSize: 28, fontWeight: "800", marginTop: 2 }}>
                    {progress.remainingPoints}
                  </Text>
                </View>
                <View style={[styles.tierBadge, { paddingHorizontal: 8, paddingVertical: 4 }]}>
                  <Text style={[styles.tierBadgeText, { fontSize: 11 }]} numberOfLines={1}>
                    {progress.nextLabel.length > 12 ? progress.nextLabel.substring(0, 12) + "..." : progress.nextLabel}
                  </Text>
                </View>
              </View>

              <View style={{ marginTop: 10 }}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progress.percent * 100}%` }]} />
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginTop: 6,
                  }}
                >
                  <Text style={styles.progressLeft}>To {progress.nextLabel}</Text>
                </View>
              </View>

              <Pressable
                onPress={() => router.push("/(app)/rewards")}
                style={[styles.linkRow, { marginTop: 10 }]}
              >
                <Text style={styles.linkText}>Open Rewards</Text>
                <Feather name="chevron-right" size={16} color="#fff" />
              </Pressable>
            </GlassCard>
          </View>

          {/* Enhanced Rewards Block */}
          <GlassCard style={{ padding: 14, marginBottom: 14 }}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.iconDot}>
                  <Feather name="star" size={14} color="#fff" />
                </View>
                <Text style={styles.sectionHeaderText}>Rewards Hub</Text>
              </View>
              <Pressable
                onPress={() => router.push("/(app)/rewards")}
                style={styles.linkRow}
              >
                <Text style={styles.linkText}>View All</Text>
                <Feather name="chevron-right" size={16} color="#fff" />
              </Pressable>
            </View>

            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              {/* Next Product Preview */}
              <View style={{ flex: 1 }}>
                <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginBottom: 4 }}>
                  Next Product
                </Text>
                {(() => {
                  const sortedProducts = allProducts.sort((a, b) => a.pointsRequired - b.pointsRequired);
                  const nextProduct = sortedProducts.find(product => product.pointsRequired > points);
                  
                  if (affordableProducts.length > 0) {
                    const firstAffordable = affordableProducts.sort((a, b) => a.pointsRequired - b.pointsRequired)[0];
                    return (
                      <View>
                        <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }} numberOfLines={1}>
                          {firstAffordable.name}
                        </Text>
                        <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
                          Available now
                        </Text>
                      </View>
                    );
                  } else if (nextProduct) {
                    return (
                      <View>
                        <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }} numberOfLines={1}>
                          {nextProduct.name}
                        </Text>
                        <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
                          {nextProduct.pointsRequired - points} pts to go
                        </Text>
                      </View>
                    );
                  } else {
                    return (
                      <View>
                        <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
                          All Products
                        </Text>
                        <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
                          Unlocked!
                        </Text>
                      </View>
                    );
                  }
                })()}
              </View>

              {/* Quick Stats */}
              <View style={{ flex: 1 }}>
                <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginBottom: 4 }}>
                  This Week
                </Text>
                <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
                  {ledger.filter(item => 
                    dayjs(item.ts).isAfter(dayjs().startOf('week')) && 
                    item.delta > 0
                  ).reduce((sum, item) => sum + item.delta, 0)} pts earned
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
                  Keep it up!
                </Text>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <Pressable
                onPress={() => router.push("/(app)/shop")}
                style={[styles.quickActionButton, { flex: 1 }]}
              >
                <Feather name="shopping-bag" size={16} color="#fff" />
                <Text style={styles.quickActionText}>Shop</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push("/(app)/rewards")}
                style={[styles.quickActionButton, { flex: 1 }]}
              >
                <Feather name="gift" size={16} color="#fff" />
                <Text style={styles.quickActionText}>Redeem</Text>
              </Pressable>
            </View>
          </GlassCard>

          {/* Hair Health Journey */}
          <GlassCard style={{ padding: 14, marginBottom: 14 }}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.iconDot}>
                  <Feather name="trending-up" size={14} color="#fff" />
                </View>
                <Text style={styles.sectionHeaderText}>Hair Health Journey</Text>
              </View>
            </View>

            <RecoveryChart weeks={16} curve={{ plateauAt: 0.82 }} durationMs={18000} loop />

            <View style={{ marginTop: 10 }}>
              <Text style={styles.sparkTitle}>Daily check-ins (last 14 days)</Text>
              <View style={styles.sparkRow}>
                {checkinBars.map((v, i) => (
                  <View
                    key={i}
                    style={[
                      styles.sparkBar,
                      { opacity: v ? 1 : 0.35, height: v ? 16 : 8 },
                    ]}
                  />
                ))}
              </View>
            </View>
          </GlassCard>

          {/* Today's Routine (below) */}
          <GlassCard style={{ padding: 14, marginBottom: 14 }}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.iconDot}>
                  <Feather name="calendar" size={14} color="#fff" />
                </View>
                <Text style={styles.sectionHeaderText}>Today’s Routine</Text>
              </View>
              <View style={styles.counterPill}>
                <Text style={styles.counterPillText}>
                  {doneToday} of {totalToday} complete
                </Text>
              </View>
            </View>

            <View style={{ marginTop: 8, gap: 10 }}>
              {todaysSteps.map((s) => {
                const done = isCompletedToday(s.id);
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => onToggle(s)}
                    style={[styles.taskCard, done && styles.taskCardDone]}
                  >
                    <View style={styles.checkCircle}>
                      {done ? <Feather name="check" size={14} color="#fff" /> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.taskTitle}>{s.name}</Text>
                      {s.time ? <Text style={styles.taskTime}>{s.time}</Text> : null}
                    </View>
                    <View style={styles.pointIndicator}>
                      <Text style={styles.pointText}>+1</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Pressable onPress={() => router.push("/(app)/routine")} style={styles.longBtn}>
              <Text style={styles.longBtnText}>View Full Routine</Text>
            </Pressable>
          </GlassCard>

          {/* Help & Support Card */}
          <GlassCard style={styles.helpCard}>
            <Pressable 
              style={styles.helpButton}
              onPress={() => router.push("/support-chat")}
            >
              <View style={styles.helpContent}>
                <View style={styles.helpIconContainer}>
                  <Feather name="help-circle" size={20} color="#fff" />
                </View>
                <View style={styles.helpTextContainer}>
                  <Text style={styles.helpTitle}>Need Help?</Text>
                  <Text style={styles.helpSubtitle}>Get support from our team</Text>
                </View>
                <Feather name="arrow-right" size={16} color="rgba(255,255,255,0.6)" />
              </View>
            </Pressable>
          </GlassCard>

        </ScreenScrollView>
      </SafeAreaView>

      {/* Daily Check-in Popup */}
      <DailyCheckInPopup 
        visible={showDailyCheckInPopup} 
        onClose={() => setShowDailyCheckInPopup(false)} 
      />

      {/* Signup Bonus Popup */}
      <SignupBonusPopup 
        visible={showSignupBonusPopup} 
        onClose={() => {
          setShowSignupBonusPopup(false);
          // Show daily check-in popup 5 seconds after signup bonus closes
          dailyCheckInTimeoutRef.current = setTimeout(() => {
            console.log("Checking for daily check-in popup after signup bonus...");
            console.log("shouldShowDailyPopup():", shouldShowDailyPopup());
            if (shouldShowDailyPopup()) {
              console.log("Showing daily check-in popup");
              setShowDailyCheckInPopup(true);
              markPopupShown();
            } else {
              console.log("Daily check-in conditions not met");
            }
            dailyCheckInTimeoutRef.current = null;
          }, 5000);
        }} 
      />

      {/* First Point Popup */}
      <FirstPointPopup 
        visible={showFirstPointPopup} 
        onClose={() => {
          setShowFirstPointPopup(false);
          // Clear any pending timeout
          if (firstPointTimeoutRef.current) {
            clearTimeout(firstPointTimeoutRef.current);
            firstPointTimeoutRef.current = null;
          }
        }} 
      />

    </View>
  );
}

/* -------------------------------- helpers/ui ------------------------------- */

function GlassCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[styles.glassCard, style]}>
      {children}
    </View>
  );
}

function StatTile({ big, caption }: { big: string; caption: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statBig}>{big}</Text>
      <Text style={styles.statCap}>{caption}</Text>
    </View>
  );
}

/* --------------------------------- styles --------------------------------- */

const styles = StyleSheet.create({
  // Match Rewards header
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

  axisLabel: { color: "rgba(255,255,255,0.7)", fontSize: 10 },

  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionHeaderLeft: { flexDirection: "row", alignItems: "center" },
  sectionHeaderText: { color: "#fff", fontWeight: "700" },
  iconDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    marginRight: 8,
  },

  glassCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  glassShadow: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
  },
  glassBody: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.08)" },

  // sparkline
  sparkTitle: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginBottom: 6, fontWeight: "600" },
  sparkRow: { flexDirection: "row", alignItems: "flex-end", gap: 4 },
  sparkBar: {
    width: 10,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },

  counterPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  counterPillText: { color: "#fff", fontWeight: "700", fontSize: 12 },

  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  taskCardDone: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.35)",
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  taskTitle: { color: "#fff", fontWeight: "700" },
  taskTime: { color: "rgba(255,255,255,0.80)", marginTop: 2 },
  pointIndicator: {
  },
  pointText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  longBtn: {
    marginTop: 12,
    alignItems: "center",
    borderRadius: 999,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.30)",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  longBtnText: { color: "#fff", fontWeight: "800" },

  // Help card styles
  helpCard: {
    padding: 16,
    marginBottom: 16,
  },
  helpButton: {
    width: "100%",
  },
  helpContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  helpIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  helpTextContainer: {
    flex: 1,
  },
  helpTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  helpSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
  },

  statTile: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.08)",
    minHeight: 60,
  },
  statBig: { color: "#fff", fontSize: 22, fontWeight: "800" },
  statCap: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },

  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  tierBadgeText: { color: "#fff", fontWeight: "800", fontSize: 12 },

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
  progressLeft: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "600" },
  progressRight: { color: "rgba(255,255,255,0.8)", fontSize: 12 },

  linkRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  linkText: { color: "#fff", textDecorationLine: "underline", fontWeight: "700" },

  quickActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  quickActionText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  // Points display styles (from rewards page)
  pointsLabel: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginLeft: 8 },
  pointsValue: { color: "#fff", fontSize: 40, fontWeight: "800" },
  progressLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },

  // Redeem button styles
  redeemButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 8, // 20% smaller: 10 * 0.8 = 8
    paddingVertical: 6.8, // 20% smaller: 8.5 * 0.8 = 6.8
    borderRadius: 13.6, // 20% smaller: 17 * 0.8 = 13.6
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    marginTop: 0, // Align with container's top padding (17.5px)
  },
  redeemButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

});
