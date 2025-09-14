// app/dashboard.tsx
import React from "react";
import { View, Text, ImageBackground, ScrollView, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { usePlanStore } from "@/state/planStore";

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const plan = usePlanStore((s) => s.plan);

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
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: insets.bottom + 28,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-white text-[22px] font-semibold">Dashboard</Text>
          </View>

          <GlassCard className="p-5 mb-6">
            <View className="flex-row items-center mb-2">
              <Feather name="user-check" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text className="text-white font-semibold">Welcome back</Text>
            </View>
            <Text className="text-white/85">
              {plan
                ? "Your personalized plan is saved on this device."
                : "No plan found yet — create one to get started."}
            </Text>
          </GlassCard>

          <GlassCard className="p-5 mb-6">
            <View className="flex-row items-center mb-3">
              <Feather name="map" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text className="text-white font-semibold">Quick links</Text>
            </View>

            <View className="gap-8">
              <RowLink label="Summary" icon="bookmark" onPress={() => router.push("/summary")} />
              <RowLink label="Routine" icon="calendar" onPress={() => router.push("/routine-overview")} />
              <RowLink label="Recommendations" icon="star" onPress={() => router.push("/recommendations")} />
              <RowLink label="Cart" icon="shopping-cart" onPress={() => router.push("/cart")} />
            </View>
          </GlassCard>
          <GlassCard className="p-5 mb-6">
            <View className="flex-row items-center mb-3">
              <Feather name="map" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text className="text-white font-semibold">Quick links</Text>
            </View>

            <View className="gap-8">
              <RowLink label="Summary" icon="bookmark" onPress={() => router.push("/summary")} />
              <RowLink label="Routine" icon="calendar" onPress={() => router.push("/routine-overview")} />
              <RowLink label="Recommendations" icon="star" onPress={() => router.push("/recommendations")} />
              <RowLink label="Cart" icon="shopping-cart" onPress={() => router.push("/cart")} />
            </View>
          </GlassCard>

          <Text className="text-white/50 text-xs text-center mt-8">
            Dummy dashboard for routing verification
          </Text>
        </ScrollView>
      </SafeAreaView>
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

function RowLink({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between rounded-xl bg-white/10 border border-white/20 px-4 py-4 active:opacity-90"
    >
      <View className="flex-row items-center">
        <Feather name={icon} size={18} color="#fff" style={{ marginRight: 10 }} />
        <Text className="text-white font-medium">{label}</Text>
      </View>
      <Feather name="chevron-right" size={20} color="#fff" />
    </Pressable>
  );
}
