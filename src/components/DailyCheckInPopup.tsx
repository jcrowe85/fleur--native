// src/components/DailyCheckInPopup.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ImageBackground,
  SafeAreaView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import dayjs from "dayjs";
import { useCheckInStore, ScalpCondition, HairShedding, OverallFeeling } from "@/state/checkinStore";
import { onDailyCheckIn } from "@/services/rewards";

const SCALP_LABELS = ["Dry", "Balanced", "Oily"];
const SHEDDING_LABELS = ["Low", "Medium", "High"];
const FEELING_LABELS = ["Not great", "Okay", "Great"];

const getScalpCondition = (value: number): ScalpCondition => {
  if (value <= 0.33) return "dry";
  if (value <= 0.67) return "balanced";
  return "oily";
};

const getHairShedding = (value: number): HairShedding => {
  if (value <= 0.33) return "low";
  if (value <= 0.67) return "medium";
  return "high";
};

const getOverallFeeling = (value: number): OverallFeeling => {
  if (value <= 0.33) return "not_great";
  if (value <= 0.67) return "okay";
  return "great";
};

const getValueFromScalpCondition = (condition: ScalpCondition): number => {
  switch (condition) {
    case "dry": return 0;
    case "balanced": return 0.5;
    case "oily": return 1;
    default: return 0;
  }
};

const getValueFromHairShedding = (shedding: HairShedding): number => {
  switch (shedding) {
    case "low": return 0;
    case "medium": return 0.5;
    case "high": return 1;
    default: return 0;
  }
};

const getValueFromOverallFeeling = (feeling: OverallFeeling): number => {
  switch (feeling) {
    case "not_great": return 0;
    case "okay": return 0.5;
    case "great": return 1;
    default: return 0;
  }
};

interface OptionSelectorProps {
  options: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  label: string;
}

function OptionSelector({ options, selectedIndex, onSelect, label }: OptionSelectorProps) {
  return (
    <View style={styles.optionGroup}>
      <Text style={styles.optionLabel}>{label}</Text>
      <View style={styles.optionsContainer}>
        {options.map((option, index) => (
          <Pressable
            key={index}
            style={[
              styles.optionButton,
              selectedIndex === index && styles.optionButtonSelected,
            ]}
            onPress={() => onSelect(index)}
          >
            <Text
              style={[
                styles.optionText,
                selectedIndex === index && styles.optionTextSelected,
              ]}
            >
              {option}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

interface DailyCheckInPopupProps {
  visible: boolean;
  onClose: () => void;
}

export default function DailyCheckInPopup({ visible, onClose }: DailyCheckInPopupProps) {
  const { addCheckIn, getCheckInForDate, hasCheckedInToday } = useCheckInStore();
  const insets = useSafeAreaInsets();
  
  const [scalpValue, setScalpValue] = useState(-1);
  const [sheddingValue, setSheddingValue] = useState(-1);
  const [feelingValue, setFeelingValue] = useState(-1);
  const [isCompleted, setIsCompleted] = useState(false);

  // Initialize state based on existing check-in
  useEffect(() => {
    if (visible) {
      const today = dayjs().format("YYYY-MM-DD");
      const existingCheckIn = getCheckInForDate(today);
      
      if (existingCheckIn) {
        setScalpValue(getValueFromScalpCondition(existingCheckIn.scalpCondition));
        setSheddingValue(getValueFromHairShedding(existingCheckIn.hairShedding));
        setFeelingValue(getValueFromOverallFeeling(existingCheckIn.overallFeeling));
        setIsCompleted(true);
      } else {
        // Reset to unselected state
        setScalpValue(-1);
        setSheddingValue(-1);
        setFeelingValue(-1);
        setIsCompleted(false);
      }
    }
  }, [visible]); // Remove getCheckInForDate from dependencies to prevent infinite re-renders

  const handleSave = async () => {
    if (scalpValue === -1 || sheddingValue === -1 || feelingValue === -1) {
      return;
    }

    try {
      const checkInData = {
        scalpCondition: getScalpCondition(scalpValue),
        hairShedding: getHairShedding(sheddingValue),
        overallFeeling: getOverallFeeling(feelingValue),
      };

      // Award points first, then save check-in
      await onDailyCheckIn();
      addCheckIn(checkInData);
      
      setIsCompleted(true);
      
      // Close popup after a short delay
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error("Error saving check-in:", error);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const isFormValid = scalpValue !== -1 && sheddingValue !== -1 && feelingValue !== -1;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <ImageBackground
          source={require("../../assets/dashboard.png")}
          resizeMode="cover"
          style={StyleSheet.absoluteFillObject as any}
        />
        <SafeAreaView style={[styles.safeArea, { paddingTop: Math.max(insets.top, 20) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconDot}>
                <Feather name="check-circle" size={14} color="#fff" />
              </View>
              <View style={styles.titleContainer}>
                <Text style={styles.title}>Daily Hair Check-in</Text>
                <Text style={styles.pointText}>Earn +1 point</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              {isCompleted && (
                <View style={styles.completedBadge}>
                  <Feather name="check" size={12} color="#fff" />
                </View>
              )}
              <Pressable style={styles.closeButton} onPress={onClose}>
                <Feather name="x" size={20} color="rgba(255,255,255,0.7)" />
              </Pressable>
            </View>
          </View>

          {/* Centered Content */}
          <View style={styles.contentContainer}>
            <View style={styles.content}>
              <Text style={styles.subtitle}>
                How is your hair feeling today?
              </Text>

              <View style={styles.form}>
                <OptionSelector
                  options={SCALP_LABELS}
                  selectedIndex={scalpValue}
                  onSelect={setScalpValue}
                  label="Scalp Condition"
                />

                <OptionSelector
                  options={SHEDDING_LABELS}
                  selectedIndex={sheddingValue}
                  onSelect={setSheddingValue}
                  label="Hair Shedding"
                />

                <OptionSelector
                  options={FEELING_LABELS}
                  selectedIndex={feelingValue}
                  onSelect={setFeelingValue}
                  label="Overall Feeling"
                />
              </View>
            </View>

            {/* Actions */}
            <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              <Pressable
                style={[styles.skipButton]}
                onPress={handleSkip}
              >
                <Text style={styles.skipButtonText}>Skip</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.saveButton,
                  !isFormValid && styles.saveButtonDisabled
                ]}
                onPress={handleSave}
                disabled={!isFormValid}
              >
                <Text style={[
                  styles.saveButtonText,
                  !isFormValid && styles.saveButtonTextDisabled
                ]}>
                  Save Check-in
                </Text>
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
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 32,
    marginTop: 20,
    maxWidth: 380,
    alignSelf: "center",
    width: "100%",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  titleContainer: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  iconDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  pointText: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.8)",
  },
  completedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    maxWidth: 380,
    alignSelf: "center",
    width: "100%",
  },
  subtitle: {
    fontSize: 18,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    marginBottom: 40,
    fontWeight: "500",
  },
  form: {
    gap: 28,
    width: "100%",
  },
  optionGroup: {
    gap: 12,
    width: "100%",
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 12,
    textAlign: "left",
  },
  optionsContainer: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  optionButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
  },
  optionButtonSelected: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.50)",
  },
  optionText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    fontWeight: "500",
  },
  optionTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 40,
    paddingHorizontal: 0,
    maxWidth: 380,
    alignSelf: "center",
    width: "100%",
  },
  skipButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    minHeight: 52,
    justifyContent: "center",
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "rgba(255,255,255,0.7)",
  },
  saveButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    minHeight: 52,
    justifyContent: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.10)",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  saveButtonTextDisabled: {
    color: "rgba(255,255,255,0.4)",
  },
});
