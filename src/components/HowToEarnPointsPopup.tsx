// src/components/HowToEarnPointsPopup.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ImageBackground,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";

interface HowToEarnPointsPopupProps {
  visible: boolean;
  onClose: () => void;
}

interface PointRuleProps {
  icon: string;
  title: string;
  description: string;
  points: string;
}

function PointRule({ icon, title, description, points }: PointRuleProps) {
  return (
    <View style={styles.ruleContainer}>
      <View style={styles.ruleIcon}>
        <Feather name={icon as any} size={20} color="#fff" />
      </View>
      <View style={styles.ruleContent}>
        <View style={styles.ruleHeader}>
          <Text style={styles.ruleTitle}>{title}</Text>
          <Text style={styles.rulePoints}>{points}</Text>
        </View>
        <Text style={styles.ruleDescription}>{description}</Text>
      </View>
    </View>
  );
}

export default function HowToEarnPointsPopup({ visible, onClose }: HowToEarnPointsPopupProps) {
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
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>How to Earn Points</Text>
              <Text style={styles.subtitle}>
                Points accrue from activity and purchases. Here's how you can earn them:
              </Text>
            </View>

            {/* Rules */}
            <View style={styles.rulesContainer}>
              <PointRule
                icon="dollar-sign"
                title="$1 spent = 1 point"
                description="Points post after confirmed orders."
                points="1/$"
              />
              <PointRule
                icon="check-circle"
                title="Daily check-in"
                description="Keep your streak going."
                points="+1"
              />
              <PointRule
                icon="trending-up"
                title="7-day streak"
                description="Extra reward for consistency."
                points="+2 bonus"
              />
              <PointRule
                icon="calendar"
                title="Daily routine tasks"
                description="Max 5 points per day."
                points="+1 each"
              />
              <PointRule
                icon="play-circle"
                title="First routine step"
                description="5 bonus + 1 task point."
                points="+6"
              />
              <PointRule
                icon="message-circle"
                title="First community post"
                description="Say hi to the community."
                points="+5"
              />
              <PointRule
                icon="message-square"
                title="First comment"
                description="Engage with the community."
                points="+5"
              />
              <PointRule
                icon="heart"
                title="First like"
                description="Show some love."
                points="+1"
              />
              <PointRule
                icon="thumbs-up"
                title="Post engagement"
                description="Your content is popular!"
                points="+1 per 100 likes"
              />
              <PointRule
                icon="message-circle"
                title="Post engagement"
                description="Great discussions."
                points="+5 per 10 comments"
              />
              <PointRule
                icon="gift"
                title="Refer a friend"
                description="Max 20 referrals."
                points="+20"
              />
              <PointRule
                icon="star"
                title="Write a review"
                description="Share your experience to help others."
                points="+5"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    lineHeight: 22,
  },
  rulesContainer: {
    gap: 16,
  },
  ruleContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  ruleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  ruleContent: {
    flex: 1,
  },
  ruleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  ruleTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    flex: 1,
  },
  rulePoints: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ruleDescription: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 18,
  },
});
