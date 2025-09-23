// src/components/SignupBonusPopup.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ImageBackground,
  SafeAreaView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

interface SignupBonusPopupProps {
  visible: boolean;
  onClose: () => void;
}

export default function SignupBonusPopup({ visible, onClose }: SignupBonusPopupProps) {
  const handleRewardsPress = () => {
    onClose();
    router.push("/(app)/rewards");
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <ImageBackground
          source={require("../../assets/dashboard.png")}
          resizeMode="cover"
          style={StyleSheet.absoluteFillObject as any}
        />
        <SafeAreaView style={styles.safeArea}>
          {/* Close button */}
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Feather name="x" size={24} color="rgba(255,255,255,0.8)" />
          </Pressable>

          {/* Main content */}
          <View style={styles.content}>
            {/* Large point text */}
            <Text style={styles.pointText}>+250</Text>

            {/* Welcome message */}
            <Text style={styles.welcomeText}>Welcome to Fleur!</Text>

            {/* Description paragraph */}
            <Text style={styles.descriptionText}>
              You've earned 250 points as a welcome bonus to get you started on your hair journey. Use these points to redeem products and unlock rewards.
            </Text>

            {/* Rewards button */}
            <Pressable style={styles.rewardsButton} onPress={handleRewardsPress}>
              <Text style={styles.rewardsButtonText}>View Rewards</Text>
              <Feather name="arrow-right" size={16} color="#fff" />
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#120d0a",
  },
  safeArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  pointText: {
    fontSize: 72,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "700",
    color: "rgba(255,255,255,0.95)",
    textAlign: "center",
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    maxWidth: 320,
  },
  rewardsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    gap: 8,
  },
  rewardsButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
