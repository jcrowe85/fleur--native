// src/components/DailyHairCheckIn.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import dayjs from "dayjs";
import { useCheckInStore, ScalpCondition, HairShedding, OverallFeeling } from "@/state/checkinStore";
import { onDailyCheckIn } from "@/services/rewards";
import { Pressable as SliderPressable } from "react-native";

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



export default function DailyHairCheckIn({ onHidden }: { onHidden?: () => void }) {
  console.log("DEBUG: DailyHairCheckIn component rendered");
  const { addCheckIn, getCheckInForDate, hasCheckedInToday } = useCheckInStore();
  const today = dayjs().format("YYYY-MM-DD");

  const [scalpValue, setScalpValue] = useState(0);
  const [sheddingValue, setSheddingValue] = useState(0);
  const [feelingValue, setFeelingValue] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [shouldHide, setShouldHide] = useState(false);
  
  // Animation values
  const opacityAnimation = useRef(new Animated.Value(1)).current;

  // Initialize component state based on existing check-in
  useEffect(() => {
    console.log("DEBUG: DailyHairCheckIn useEffect running for date:", today);
    const existingCheckIn = getCheckInForDate(today);
    console.log("DEBUG: Existing check-in found:", !!existingCheckIn);
    
    if (existingCheckIn) {
      console.log("DEBUG: Setting completed state and hiding component");
      setScalpValue(getValueFromScalpCondition(existingCheckIn.scalpCondition));
      setSheddingValue(getValueFromHairShedding(existingCheckIn.hairShedding));
      setFeelingValue(getValueFromOverallFeeling(existingCheckIn.overallFeeling));
      setIsCompleted(true);
      // If already completed, hide the component immediately
      onHidden?.();
    } else {
      console.log("DEBUG: No existing check-in, showing form");
      setScalpValue(0);
      setSheddingValue(0);
      setFeelingValue(0);
      setIsCompleted(false);
    }
  }, [today, getCheckInForDate, onHidden]);

  const animateOut = () => {
    Animated.timing(opacityAnimation, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      setShouldHide(true);
      onHidden?.(); // Notify parent component
    });
  };

  const handleSave = () => {
    try {
      const checkInData = {
        scalpCondition: getScalpCondition(scalpValue),
        hairShedding: getHairShedding(sheddingValue),
        overallFeeling: getOverallFeeling(feelingValue),
      };

      addCheckIn(checkInData);
      setIsCompleted(true);

      // Award daily check-in points (separate from routine task rewards)
      console.log("DEBUG: Attempting to award daily check-in points...");
      const res = onDailyCheckIn();
      console.log("DEBUG: Daily check-in result:", res);
      if (res?.ok) {
        console.log("Daily check-in completed:", res.message);
      } else {
        console.log("Daily check-in failed:", res?.message);
      }

      // Start the slide-out animation after a brief delay
      setTimeout(() => {
        animateOut();
      }, 1000); // Show completed state for 1 second before animating out
    } catch (error) {
      console.error("Error saving check-in:", error);
    }
  };

  const OptionSelector = ({ 
    label, 
    value, 
    onValueChange, 
    disabled, 
    labels 
  }: { 
    label: string; 
    value: number; 
    onValueChange: (value: number) => void;
    disabled: boolean;
    labels: string[];
  }) => (
    <View style={styles.optionRow}>
      <Text style={styles.optionLabel}>{label}</Text>
      <View style={styles.optionContainer}>
        {labels.map((optionLabel, index) => {
          const optionValue = index / (labels.length - 1); // 0, 0.5, 1
          const isSelected = Math.abs(value - optionValue) < 0.1;
          return (
            <SliderPressable
              key={index}
              style={[
                styles.optionButton,
                isSelected && styles.optionButtonSelected
              ]}
              onPress={() => onValueChange(optionValue)}
              disabled={disabled}
            >
              <Text style={[
                styles.optionButtonText,
                isSelected && styles.optionButtonTextSelected
              ]}>
                {optionLabel}
              </Text>
            </SliderPressable>
          );
        })}
      </View>
    </View>
  );

  // Don't render if component should be hidden
  if (shouldHide) {
    return null;
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: opacityAnimation,
        }
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconDot}>
            <Feather name="check-circle" size={14} color="#fff" />
          </View>
          <Text style={styles.title}>Daily Hair Check-in</Text>
        </View>
        {isCompleted && (
          <View style={styles.completedBadge}>
            <Feather name="check" size={12} color="#fff" />
          </View>
        )}
      </View>
      
      <Text style={styles.subtitle}>Log how you feel today to personalize tips.</Text>

      <View style={styles.slidersContainer}>
        <OptionSelector
          label="Scalp condition"
          value={scalpValue}
          onValueChange={setScalpValue}
          disabled={isCompleted}
          labels={SCALP_LABELS}
        />

        <OptionSelector
          label="Hair shedding"
          value={sheddingValue}
          onValueChange={setSheddingValue}
          disabled={isCompleted}
          labels={SHEDDING_LABELS}
        />

        <OptionSelector
          label="Overall feeling"
          value={feelingValue}
          onValueChange={setFeelingValue}
          disabled={isCompleted}
          labels={FEELING_LABELS}
        />
      </View>

      {!isCompleted && (
        <Pressable style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Check-in</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    marginRight: 8,
  },
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  completedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    marginBottom: 16,
  },
  slidersContainer: {
    gap: 16,
  },
  optionRow: {
    gap: 8,
  },
  optionLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  optionContainer: {
    flexDirection: "row",
    gap: 8,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
  },
  optionButtonSelected: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderColor: "rgba(255,255,255,0.5)",
  },
  optionButtonText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "500",
  },
  optionButtonTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  saveButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.30)",
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});