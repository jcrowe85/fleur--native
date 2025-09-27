// src/screens/ThankYouScreen.tsx
import React, { useEffect } from "react";
import { View, Text, ImageBackground } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable } from "react-native";

export default function ThankYouScreen() {
  const { auto, pointsUsed, productSku, newBalance } = useLocalSearchParams<{ 
    auto?: string;
    pointsUsed?: string;
    productSku?: string;
    newBalance?: string;
  }>();

  // optional auto-redirect to dashboard after a short delay
  useEffect(() => {
    if (auto === "1") {
      // Longer delay for point redemptions so users can read the info
      const delay = pointsUsed ? 3000 : 1600;
      const t = setTimeout(() => router.replace("/dashboard"), delay);
      return () => clearTimeout(t);
    }
  }, [auto, pointsUsed]);

  return (
    <View className="flex-1 bg-brand-bg">
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <ImageBackground
        source={require("../../../assets/dashboard.png")}
        resizeMode="cover"
        className="absolute inset-0"
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.15)", "rgba(0,0,0,0.35)", "rgba(0,0,0,0.65)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          className="absolute inset-0"
        />
      </ImageBackground>

      <SafeAreaView className="flex-1 px-6">
        <View className="flex-1 items-center justify-center">
          <View className="w-16 h-16 rounded-full bg-white items-center justify-center mb-5">
            <Feather name="check" size={28} color="#0b0b0b" />
          </View>

          <Text className="text-white text-2xl font-semibold">
            {pointsUsed ? "Points Redeemed!" : "Order confirmed"}
          </Text>
          <Text className="text-white/80 mt-2 text-center">
            {pointsUsed ? (
              <>
                You've successfully redeemed {pointsUsed} points for this product!{"\n"}
                New point balance: {newBalance} points
              </>
            ) : (
              "We've emailed your receipt. You'll see shipping updates soon."
            )}
          </Text>

          <Pressable
            onPress={() => router.replace("/dashboard")}
            className="mt-8 rounded-full bg-white px-6 py-3 active:opacity-90"
          >
            <Text className="text-black font-semibold">Go to Dashboard</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
