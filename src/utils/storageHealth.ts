// src/utils/storageHealth.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearAllStorage } from './safeStorage';

export interface StorageHealthCheck {
  isHealthy: boolean;
  issues: string[];
  recommendations: string[];
}

export const checkStorageHealth = async (): Promise<StorageHealthCheck> => {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let isHealthy = true;

  try {
    // Test basic storage functionality
    const testKey = 'storage-health-test';
    const testValue = 'test-value';
    
    await AsyncStorage.setItem(testKey, testValue);
    const retrieved = await AsyncStorage.getItem(testKey);
    await AsyncStorage.removeItem(testKey);
    
    if (retrieved !== testValue) {
      issues.push('Storage read/write inconsistency detected');
      isHealthy = false;
    }
  } catch (error) {
    issues.push(`Storage basic functionality failed: ${error}`);
    isHealthy = false;
  }

  // Check storage size and cleanup if needed
  try {
    const keys = await AsyncStorage.getAllKeys();
    if (keys.length > 50) {
      recommendations.push('Large number of storage keys detected - consider cleanup');
    }
  } catch (error) {
    issues.push(`Failed to check storage keys: ${error}`);
    isHealthy = false;
  }

  if (!isHealthy) {
    recommendations.push('Consider clearing all storage and restarting the app');
  }

  return {
    isHealthy,
    issues,
    recommendations
  };
};

export const performStorageRecovery = async (): Promise<boolean> => {
  try {
    await clearAllStorage();
    return true;
  } catch (error) {
    console.error('Storage recovery failed:', error);
    return false;
  }
};
