// src/components/UI/RewardsPopup.tsx
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

type RewardsPopupProps = {
  visible: boolean;
  onClose: () => void;
  points: number;
  reason: string;
  description?: string;
};

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function RewardsPopup({
  visible,
  onClose,
  points,
  reason,
  description,
}: RewardsPopupProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pointsScaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (visible) {
      // Start animations
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(200),
          Animated.spring(pointsScaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 150,
            friction: 6,
          }),
        ]),
      ]).start();
    } else {
      // Reset animations
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      pointsScaleAnim.setValue(0.5);
    }
  }, [visible, scaleAnim, opacityAnim, pointsScaleAnim]);

  const getReasonIcon = (reason: string): keyof typeof Feather.glyphMap => {
    switch (reason) {
      case "seven_day_streak_bonus":
        return "calendar";
      case "post_engagement_likes":
      case "post_engagement_comments":
        return "heart";
      case "refer_friend":
        return "users";
      case "first_routine_step_bonus":
        return "star";
      default:
        return "gift";
    }
  };

  const getReasonTitle = (reason: string): string => {
    switch (reason) {
      case "seven_day_streak_bonus":
        return "7-Day Streak!";
      case "post_engagement_likes":
        return "Post Engagement!";
      case "post_engagement_comments":
        return "Post Engagement!";
      case "refer_friend":
        return "Friend Referred!";
      case "first_routine_step_bonus":
        return "First Routine Step!";
      default:
        return "Reward Earned!";
    }
  };

  const getReasonDescription = (reason: string, points: number): string => {
    switch (reason) {
      case "seven_day_streak_bonus":
        return "You've checked in for 7 days straight! Keep up the great work.";
      case "post_engagement_likes":
        return `Your post reached ${points * 100} likes! Your content is resonating with the community.`;
      case "post_engagement_comments":
        return `Your post got ${Math.floor(points / 5) * 10} comments! Great engagement.`;
      case "refer_friend":
        return "Thanks for sharing Fleur with a friend! You're helping others on their hair journey.";
      case "first_routine_step_bonus":
        return "Congratulations on completing your first routine step! You're on your way to healthier hair.";
      default:
        return description || "Keep up the great work!";
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: opacityAnim,
          },
        ]}
      >
        <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
        
        <Animated.View
          style={[
            styles.popup,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Close button */}
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Feather name="x" size={24} color="#6b5f5a" />
          </Pressable>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconBackground}>
              <Feather name={getReasonIcon(reason)} size={32} color="#fff" />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>{getReasonTitle(reason)}</Text>

          {/* Points */}
          <Animated.View
            style={[
              styles.pointsContainer,
              {
                transform: [{ scale: pointsScaleAnim }],
              },
            ]}
          >
            <Text style={styles.pointsText}>+{points}</Text>
            <Text style={styles.pointsLabel}>POINTS</Text>
          </Animated.View>

          {/* Description */}
          <Text style={styles.description}>
            {getReasonDescription(reason, points)}
          </Text>

          {/* Back to app button */}
          <Pressable style={styles.backButton} onPress={onClose}>
            <Text style={styles.backButtonText}>Back to App</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  popup: {
    backgroundColor: "#f5f1ee",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    maxWidth: screenWidth - 40,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 8,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#8e7e76",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#2d241f",
    textAlign: "center",
    marginBottom: 16,
  },
  pointsContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  pointsText: {
    fontSize: 48,
    fontWeight: "900",
    color: "#8e7e76",
    textAlign: "center",
    lineHeight: 56,
  },
  pointsLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6b5f5a",
    textAlign: "center",
    letterSpacing: 2,
    marginTop: -4,
  },
  description: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6b5f5a",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  backButton: {
    backgroundColor: "#8e7e76",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
