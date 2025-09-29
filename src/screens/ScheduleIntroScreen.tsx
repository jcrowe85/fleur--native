// src/screens/ScheduleIntroScreen.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

import { CustomButton } from "@/components/UI/CustomButton";
import { ScreenScrollView } from "@/components/UI/bottom-space";
import { useRoutineStore } from "@/state/routineStore";

export default function ScheduleIntroScreen() {
  const { markScheduleIntroSeen } = useRoutineStore();

  const handleCustomize = () => {
    markScheduleIntroSeen();
    router.push("/schedule-routine");
  };

  const handleSkip = () => {
    markScheduleIntroSeen();
    router.push("/(app)/routine");
  };

  return (
    <View style={styles.outerContainer}>
      <ImageBackground
        source={require("../../assets/dashboard.png")}
        resizeMode="cover"
        style={StyleSheet.absoluteFillObject as any}
      />
      <StatusBar style="light" />
      
      <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1 }}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Schedule Your Routine</Text>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.description}>
              Create a custom schedule for each product in your routine. Choose when and how often you'll use each item.
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <CustomButton
              onPress={handleCustomize}
              variant="wellness"
            >
              Customize My Schedule
            </CustomButton>
            
            <CustomButton
              onPress={handleSkip}
              variant="ghost"
            >
              Skip for Now
            </CustomButton>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "white",
    textAlign: "center",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  description: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    lineHeight: 24,
  },
  buttonContainer: {
    gap: 12,
    width: "100%",
  },
});
