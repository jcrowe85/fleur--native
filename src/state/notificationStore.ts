// src/state/notificationStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NotificationPreferences } from '@/services/notificationService';

type NotificationState = {
  preferences: NotificationPreferences;
  hasRequestedPermissions: boolean;
  lastPromotionalNotification: string | null; // ISO date string
  lastEducationalNotification: string | null; // ISO date string
  
  // Actions
  updatePreferences: (preferences: Partial<NotificationPreferences>) => void;
  setHasRequestedPermissions: (hasRequested: boolean) => void;
  updateLastPromotionalNotification: (date: string) => void;
  updateLastEducationalNotification: (date: string) => void;
  reset: () => void;
};

const defaultPreferences: NotificationPreferences = {
  routineNotifications: true,
  promotionalNotifications: false,
  educationalNotifications: false,
  communityNotifications: false,
};

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      preferences: defaultPreferences,
      hasRequestedPermissions: false,
      lastPromotionalNotification: null,
      lastEducationalNotification: null,

      updatePreferences: (newPreferences) => {
        set((state) => ({
          preferences: { ...state.preferences, ...newPreferences },
        }));
      },

      setHasRequestedPermissions: (hasRequested) => {
        set({ hasRequestedPermissions: hasRequested });
      },

      updateLastPromotionalNotification: (date) => {
        set({ lastPromotionalNotification: date });
      },

      updateLastEducationalNotification: (date) => {
        set({ lastEducationalNotification: date });
      },

      reset: () => {
        set({
          preferences: defaultPreferences,
          hasRequestedPermissions: false,
          lastPromotionalNotification: null,
          lastEducationalNotification: null,
        });
      },
    }),
    {
      name: 'notification-preferences',
      // See checkinStore: persist() without a storage adapter silently no-ops
      // in React Native, so the user's notification opt-outs were lost on every
      // launch and reverted to the defaults.
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
