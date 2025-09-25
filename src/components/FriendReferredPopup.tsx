// src/components/FriendReferredPopup.tsx
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

interface FriendReferredPopupProps {
  visible: boolean;
  onClose: () => void;
  friendName?: string;
  pointsEarned: number;
  totalReferrals: number;
}

export default function FriendReferredPopup({ 
  visible, 
  onClose, 
  friendName, 
  pointsEarned,
  totalReferrals 
}: FriendReferredPopupProps) {
  const handleRewardsPress = () => {
    onClose();
    router.push("/(app)/rewards");
  };

  const handleInviteMorePress = () => {
    onClose();
    router.push("/(app)/invite-friends");
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
            <Text style={styles.pointText}>+{pointsEarned}</Text>

            {/* Friend referred message */}
            <Text style={styles.welcomeText}>
              {friendName ? `${friendName} Referred!` : "Friend Referred!"}
            </Text>

            {/* Description paragraph */}
            <Text style={styles.descriptionText}>
              {friendName 
                ? `You've earned ${pointsEarned} points for referring ${friendName}! Share the love and invite more friends to earn even more rewards.`
                : `You've earned ${pointsEarned} points for referring a friend! Share the love and invite more friends to earn even more rewards.`
              }
            </Text>

            {/* Referral progress */}
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                {totalReferrals}/20 friends referred
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${(totalReferrals / 20) * 100}%` }
                  ]} 
                />
              </View>
            </View>

            {/* Action buttons */}
            <View style={styles.buttonContainer}>
              <Pressable style={styles.primaryButton} onPress={handleInviteMorePress}>
                <Text style={styles.primaryButtonText}>Invite More Friends</Text>
                <Feather name="users" size={16} color="#2d241f" />
              </Pressable>
              
              <Pressable style={styles.secondaryButton} onPress={handleRewardsPress}>
                <Text style={styles.secondaryButtonText}>View Rewards</Text>
                <Feather name="arrow-right" size={16} color="#fff" />
              </Pressable>
            </View>
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
    paddingHorizontal: 24,
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
    paddingHorizontal: 24,
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
    marginBottom: 24,
    maxWidth: 320,
  },
  progressContainer: {
    width: "100%",
    marginBottom: 32,
    alignItems: "center",
  },
  progressText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 8,
    fontWeight: "500",
  },
  progressBar: {
    width: "100%",
    height: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    backgroundColor: "#fff",
    borderRadius: 3,
  },
  buttonContainer: {
    width: "100%",
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: "#2d241f",
    fontSize: 18,
    fontWeight: "700",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    gap: 8,
  },
  secondaryButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
