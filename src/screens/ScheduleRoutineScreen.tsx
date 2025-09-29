// src/screens/ScheduleRoutineScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ImageBackground,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

import { usePlanStore } from "@/state/planStore";
import { useRoutineStore, RoutineStep, Period, Frequency } from "@/state/routineStore";
import { notificationService } from "@/services/notificationService";
import { CustomButton } from "@/components/UI/CustomButton";
import { ScreenScrollView } from "@/components/UI/bottom-space";

type DaySelection = {
  [key: number]: boolean; // 0=Sunday, 1=Monday, etc.
};

type ProductSchedule = {
  handle: string;
  title: string;
  recommendedFrequency: Frequency;
  selectedFrequency: Frequency;
  followRecommendation: boolean;
  selectedDays: DaySelection;
  period: Period;
  time: string;
  instructions: string;
};

const DAYS = [
  { key: 0, label: "Sun", short: "S" },
  { key: 1, label: "Mon", short: "M" },
  { key: 2, label: "Tue", short: "T" },
  { key: 3, label: "Wed", short: "W" },
  { key: 4, label: "Thu", short: "T" },
  { key: 5, label: "Fri", short: "F" },
  { key: 6, label: "Sat", short: "S" },
];

const FREQUENCY_OPTIONS: { value: Frequency; label: string; days: number }[] = [
  { value: "Daily", label: "Daily", days: 7 },
  { value: "3x/week", label: "3x per week", days: 3 },
  { value: "Weekly", label: "Weekly", days: 1 },
  { value: "Custom", label: "Custom", days: 0 },
];

const PERIOD_OPTIONS: { value: Period; label: string; time: string }[] = [
  { value: "morning", label: "Morning", time: "8:00 AM" },
  { value: "evening", label: "Evening", time: "8:00 PM" },
];

// Product mapping for default settings
const PRODUCT_DEFAULTS: Record<string, { period: Period; time: string; frequency: Frequency }> = {
  "bloom": { period: "morning", time: "8:00 AM", frequency: "Daily" },
  "micro-roller": { period: "evening", time: "8:00 PM", frequency: "3x/week" },
  "shampoo": { period: "morning", time: "7:30 AM", frequency: "Daily" },
  "conditioner": { period: "morning", time: "7:35 AM", frequency: "Daily" },
  "hair-mask": { period: "weekly", time: "8:00 PM", frequency: "Weekly" },
  "heat-shield": { period: "morning", time: "7:40 AM", frequency: "Daily" },
  "detangling-comb": { period: "morning", time: "7:45 AM", frequency: "Daily" },
  "vegan-biotin": { period: "morning", time: "8:30 AM", frequency: "Daily" },
  "iron": { period: "morning", time: "8:30 AM", frequency: "Daily" },
  "vitamin-d3": { period: "morning", time: "8:30 AM", frequency: "Daily" },
  "silk-pillow": { period: "evening", time: "10:00 PM", frequency: "Daily" },
};

export default function ScheduleRoutineScreen() {
  const { plan } = usePlanStore();
  const { buildFromPlan } = useRoutineStore();
  
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [productSchedules, setProductSchedules] = useState<ProductSchedule[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize product schedules from plan
  useEffect(() => {
    if (plan?.recommendations && plan.recommendations.length > 0) {
      const schedules: ProductSchedule[] = plan.recommendations.map((rec: any) => {
        const defaults = PRODUCT_DEFAULTS[rec.handle] || { period: "morning", time: "8:00 AM", frequency: "Daily" };
        return {
          handle: rec.handle,
          title: rec.title,
          recommendedFrequency: defaults.frequency,
          selectedFrequency: defaults.frequency,
          followRecommendation: true,
          selectedDays: getDefaultDays(defaults.frequency),
          period: defaults.period,
          time: defaults.time,
          instructions: rec.howToUse || "Follow product instructions",
        };
      });
      setProductSchedules(schedules);
      setIsLoading(false);
    } else {
      // No recommendations available, go back to routine tab
      router.push("/(app)/routine");
    }
  }, [plan]);

  const getDefaultDays = (frequency: Frequency): DaySelection => {
    const days: DaySelection = {};
    if (frequency === "Daily") {
      for (let i = 0; i < 7; i++) days[i] = true;
    } else if (frequency === "3x/week") {
      days[1] = true; // Monday
      days[3] = true; // Wednesday
      days[5] = true; // Friday
    } else if (frequency === "Weekly") {
      days[1] = true; // Monday
    }
    return days;
  };

  const currentProduct = productSchedules[currentProductIndex];
  const selectedDaysCount = Object.values(currentProduct?.selectedDays || {}).filter(Boolean).length;
  const recommendedDaysCount = FREQUENCY_OPTIONS.find(f => f.value === currentProduct?.recommendedFrequency)?.days || 0;

  const updateProductSchedule = (updates: Partial<ProductSchedule>) => {
    setProductSchedules(prev => 
      prev.map((schedule, index) => 
        index === currentProductIndex ? { ...schedule, ...updates } : schedule
      )
    );
  };

  const toggleDay = (dayKey: number) => {
    const newDays = { ...currentProduct.selectedDays };
    newDays[dayKey] = !newDays[dayKey];
    updateProductSchedule({ selectedDays: newDays });
  };

  const handleFrequencyChange = (frequency: Frequency) => {
    const newDays = getDefaultDays(frequency);
    updateProductSchedule({ 
      selectedFrequency: frequency,
      selectedDays: newDays,
      followRecommendation: frequency === currentProduct.recommendedFrequency
    });
  };

  const handleNext = () => {
    // Validate current product before proceeding
    if (!currentProduct) return;
    
    // Check if user needs to select days (for non-daily products)
    if (currentProduct.selectedFrequency !== "Daily") {
      const selectedCount = Object.values(currentProduct.selectedDays).filter(Boolean).length;
      if (selectedCount === 0) {
        // Show error or prevent proceeding
        return;
      }
    }
    
    if (currentProductIndex < productSchedules.length - 1) {
      setCurrentProductIndex(prev => prev + 1);
    } else {
      setShowPreview(true);
    }
  };

  const handleBack = () => {
    if (currentProductIndex > 0) {
      setCurrentProductIndex(prev => prev - 1);
    } else {
      router.push("/(app)/routine");
    }
  };

  const handleSave = async () => {
    try {
      // Convert product schedules to routine steps
      const routineSteps: RoutineStep[] = productSchedules.map(schedule => ({
        id: Math.random().toString(36).slice(2, 8) + "-" + Date.now().toString(36),
        name: schedule.title,
        period: schedule.period,
        time: schedule.time,
        frequency: schedule.selectedFrequency,
        days: Object.keys(schedule.selectedDays)
          .filter(day => schedule.selectedDays[parseInt(day)])
          .map(day => parseInt(day)),
        enabled: true,
        instructions: schedule.instructions,
        product: schedule.title,
        icon: getProductIcon(schedule.handle),
      }));

      // Save to routine store with routineSteps
      buildFromPlan({ routineSteps });
      
      // Schedule notifications for the new routine
      await notificationService.scheduleRoutineNotifications(routineSteps);
      
      // Navigate back to routine screen
      router.replace("/(app)/routine");
    } catch (error) {
      console.error("Error saving routine:", error);
      // Could show an error message to user here
    }
  };

  const getProductIcon = (handle: string): string => {
    const iconMap: Record<string, string> = {
      "bloom": "droplet",
      "micro-roller": "activity",
      "shampoo": "zap",
      "conditioner": "heart",
      "hair-mask": "star",
      "heat-shield": "shield",
      "detangling-comb": "feather",
      "vegan-biotin": "coffee",
      "iron": "coffee",
      "vitamin-d3": "coffee",
      "silk-pillow": "moon",
    };
    return iconMap[handle] || "circle";
  };

  const getTimeOptions = (period: Period) => {
    if (period === "morning") {
      return ["6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM"];
    } else if (period === "evening") {
      return ["6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM", "10:00 PM", "10:30 PM"];
    } else {
      return ["6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM"];
    }
  };

  const getValidationMessage = () => {
    if (!currentProduct) return "";
    
    const isFollowingRecommendation = currentProduct.selectedFrequency === currentProduct.recommendedFrequency;
    
    if (isFollowingRecommendation) {
      if (selectedDaysCount !== recommendedDaysCount) {
        return `Please select exactly ${recommendedDaysCount} days as recommended`;
      }
      return `✅ Following recommendation (${selectedDaysCount} days selected)`;
    } else {
      if (selectedDaysCount < recommendedDaysCount) {
        return `⚠️ Custom schedule (${selectedDaysCount} days selected - less than recommended ${recommendedDaysCount}x/week)`;
      }
      return `✅ Custom schedule (${selectedDaysCount} days selected)`;
    }
  };

  if (showPreview) {
    return (
      <View style={styles.container}>
        <ImageBackground
          source={require("../../assets/dashboard.png")}
          resizeMode="cover"
          style={StyleSheet.absoluteFillObject as any}
        />
        <StatusBar style="light" />
        <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1 }}>
        <View style={styles.headerWrap}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 }}>
            <Pressable
              onPress={() => setShowPreview(false)}
              hitSlop={10}
              style={{ padding: 8, borderRadius: 20 }}
            >
              <Feather name="arrow-left" size={18} color="#fff" />
            </Pressable>

            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={styles.headerTitle}>Preview Your Routine</Text>
            </View>

            <View style={{ width: 34 }} />
          </View>
        </View>

          <ScreenScrollView
            contentContainerStyle={{ paddingHorizontal: 20 }}
            bottomExtra={20}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.previewTitle}>Your Personalized Routine</Text>
            
            {productSchedules.map((schedule, index) => (
              <View key={index} style={styles.previewItem}>
                <Text style={styles.previewProductName}>{schedule.title}</Text>
                <Text style={styles.previewDetails}>
                  {schedule.selectedFrequency} • {schedule.period} • {schedule.time}
                </Text>
                <Text style={styles.previewDays}>
                  {DAYS.filter(day => schedule.selectedDays[day.key])
                    .map(day => day.label)
                    .join(", ")}
                </Text>
              </View>
            ))}

            {/* Save Button */}
            <View style={styles.navigationContainer}>
              <CustomButton
                onPress={handleSave}
                variant="wellness"
              >
                Save Routine
              </CustomButton>
            </View>
          </ScreenScrollView>
        </SafeAreaView>
      </View>
    );
  }

  if (isLoading || !currentProduct) {
    return (
      <View style={styles.container}>
        <ImageBackground
          source={require("../../assets/dashboard.png")}
          resizeMode="cover"
          style={StyleSheet.absoluteFillObject as any}
        />
        <StatusBar style="light" />
        <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={styles.loadingText}>Loading your routine...</Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require("../../assets/dashboard.png")}
        resizeMode="cover"
        style={StyleSheet.absoluteFillObject as any}
      />
      <StatusBar style="light" />
      <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1 }}>
        <View style={styles.headerWrap}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 }}>
            <Pressable
              onPress={handleBack}
              hitSlop={10}
              style={{ padding: 8, borderRadius: 20 }}
            >
              <Feather name="arrow-left" size={18} color="#fff" />
            </Pressable>

            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={styles.headerTitle}>Schedule Your Routine</Text>
              <Text style={styles.headerSub}>{currentProduct.title}</Text>
            </View>

            <View style={{ width: 34 }} />
          </View>
        </View>

        <ScreenScrollView
          contentContainerStyle={{ paddingHorizontal: 20 }}
          bottomExtra={20}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topSpacing} />
          
          {/* Product Name Title */}
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>{currentProduct.title}</Text>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.questionTitle}>How often will you use this?</Text>
            
            {FREQUENCY_OPTIONS.map((option) => {
              const isRecommended = option.value === currentProduct.recommendedFrequency;
              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.optionButton,
                    currentProduct.selectedFrequency === option.value && styles.optionButtonSelected
                  ]}
                  onPress={() => handleFrequencyChange(option.value)}
                >
                  <View style={styles.optionContent}>
                    <View style={[
                      styles.radioButton,
                      currentProduct.selectedFrequency === option.value && styles.radioButtonSelected
                    ]} />
                    <Text style={[
                      styles.optionText,
                      currentProduct.selectedFrequency === option.value && styles.optionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                    {isRecommended && (
                      <Text style={styles.recommendedLabel}>(recommended)</Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {currentProduct.selectedFrequency !== "Daily" && (
            <View style={styles.section}>
              <Text style={styles.questionTitle}>Select your days:</Text>
              <View style={styles.daysContainer}>
                {DAYS.map((day) => (
                  <Pressable
                    key={day.key}
                    style={[
                      styles.dayButton,
                      currentProduct.selectedDays[day.key] && styles.dayButtonSelected
                    ]}
                    onPress={() => toggleDay(day.key)}
                  >
                    <Text style={[
                      styles.dayButtonText,
                      currentProduct.selectedDays[day.key] && styles.dayButtonTextSelected
                    ]}>
                      {day.short}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[
                styles.validationText,
                selectedDaysCount === recommendedDaysCount ? styles.validationSuccess : styles.validationWarning
              ]}>
                {getValidationMessage()}
              </Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.questionTitle}>When will you use this?</Text>
            {PERIOD_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.optionButton,
                  currentProduct.period === option.value && styles.optionButtonSelected
                ]}
                onPress={() => {
                  const newPeriod = option.value;
                  const timeOptions = getTimeOptions(newPeriod);
                  // If current time is not in the new period's options, use the first option
                  const newTime = timeOptions.includes(currentProduct.time) 
                    ? currentProduct.time 
                    : timeOptions[0];
                  updateProductSchedule({ 
                    period: newPeriod,
                    time: newTime
                  });
                }}
              >
                <View style={styles.optionContent}>
                  <View style={[
                    styles.radioButton,
                    currentProduct.period === option.value && styles.radioButtonSelected
                  ]} />
                  <Text style={[
                    styles.optionText,
                    currentProduct.period === option.value && styles.optionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.questionTitle}>What time?</Text>
            <View style={styles.timeGrid}>
              {getTimeOptions(currentProduct.period).map((time) => (
                <Pressable
                  key={time}
                  style={[
                    styles.timeOption,
                    currentProduct.time === time && styles.timeOptionSelected
                  ]}
                  onPress={() => updateProductSchedule({ time })}
                >
                  <Text style={[
                    styles.timeOptionText,
                    currentProduct.time === time && styles.timeOptionTextSelected
                  ]}>
                    {time}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Navigation Buttons */}
          <View style={styles.navigationContainer}>
            <CustomButton
              onPress={handleNext}
              variant="wellness"
            >
              {currentProductIndex === productSchedules.length - 1 ? "Preview Routine" : "Next Product"}
            </CustomButton>
          </View>
        </ScreenScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#120d0a",
  },
  // Match shop header pattern
  headerWrap: {
    paddingTop: 32,
    marginBottom: 12,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
  },
  headerSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  topSpacing: {
    height: 24,
  },
  loadingText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  section: {
    marginBottom: 18,
  },
  sectionTitleContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "white",
    marginBottom: 12,
  },
  questionTitle: {
    fontSize: 14,
    fontWeight: "400",
    color: "white",
    marginBottom: 12,
  },
  optionButton: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  optionButtonSelected: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    marginRight: 12,
  },
  radioButtonSelected: {
    borderColor: "rgba(255,255,255,0.8)",
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  optionText: {
    fontSize: 14,
    color: "#fff",
  },
  optionTextSelected: {
    color: "white",
  },
  recommendedLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    marginLeft: 8,
    fontStyle: "italic",
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeOption: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 70,
    alignItems: "center",
  },
  timeOptionSelected: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  timeOptionText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  timeOptionTextSelected: {
    color: "white",
    fontWeight: "600",
  },
  daysContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  dayButtonSelected: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  dayButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  dayButtonTextSelected: {
    color: "white",
  },
  validationText: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
  validationSuccess: {
    color: "#fff",
  },
  validationWarning: {
    color: "rgba(255,255,255,0.8)",
  },
  navigationContainer: {
    paddingTop: 24,
    paddingBottom: 20,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 18,
    textAlign: "center",
  },
  previewItem: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  previewProductName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  previewDetails: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 4,
  },
  previewDays: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
});
