// src/utils/safeStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

// Custom storage with error handling to prevent app crashes
export const createSafeStorage = () => {
  return {
    getItem: async (name: string): Promise<string | null> => {
      try {
        const item = await AsyncStorage.getItem(name);
        return item;
      } catch (error) {
        console.warn(`Failed to get item ${name} from storage:`, error);
        return null;
      }
    },
    setItem: async (name: string, value: string): Promise<void> => {
      try {
        await AsyncStorage.setItem(name, value);
      } catch (error) {
        console.warn(`Failed to set item ${name} in storage:`, error);
        // Don't throw - just log the error to prevent app crashes
      }
    },
    removeItem: async (name: string): Promise<void> => {
      try {
        await AsyncStorage.removeItem(name);
      } catch (error) {
        console.warn(`Failed to remove item ${name} from storage:`, error);
      }
    },
  };
};

// Storage cleanup utility
export const clearAllStorage = async (): Promise<void> => {
  const storageKeys = [
    "routine:v2",
    "rewards:v1", 
    "checkin:v1",
    "notifications:v1",
    "purchases:v1",
    "recommendations:v1",
    "profile:v1",
    "plan:v1",
    "onboarding:v1"
  ];

  try {
    await Promise.all(storageKeys.map(key => AsyncStorage.removeItem(key)));
  } catch (error) {
    console.error("Failed to clear some storage items:", error);
  }
};
