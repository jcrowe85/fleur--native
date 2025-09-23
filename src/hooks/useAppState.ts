// src/hooks/useAppState.ts
import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import dayjs from 'dayjs';

interface UseAppStateOptions {
  onAppBecameActive?: () => void;
  onAppBecameInactive?: () => void;
  onAppBecameBackground?: () => void;
}

export function useAppState({
  onAppBecameActive,
  onAppBecameInactive,
  onAppBecameBackground,
}: UseAppStateOptions = {}) {
  const appState = useRef(AppState.currentState);
  const lastActiveTime = useRef<Date | null>(null);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const currentTime = new Date();
      
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App became active
        lastActiveTime.current = currentTime;
        onAppBecameActive?.();
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App became inactive or background
        onAppBecameInactive?.();
      } else if (appState.current.match(/active|inactive/) && nextAppState === 'background') {
        // App went to background
        onAppBecameBackground?.();
      }
      
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [onAppBecameActive, onAppBecameInactive, onAppBecameBackground]);

  return {
    currentAppState: appState.current,
    lastActiveTime: lastActiveTime.current,
  };
}

// Hook specifically for daily check-in popup logic
export function useDailyCheckInAppState() {
  const lastAppOpenDate = useRef<string | null>(null);
  
  const isFirstAppOpenToday = useCallback((): boolean => {
    const today = dayjs().format('YYYY-MM-DD');
    const currentHour = dayjs().hour();
    
    // Only consider it a "new day" after 4am
    if (currentHour < 4) {
      return false;
    }
    
    // Check if this is the first app open today
    if (lastAppOpenDate.current !== today) {
      lastAppOpenDate.current = today;
      return true;
    }
    
    return false;
  }, []);

  useAppState({
    onAppBecameActive: () => {
      // This will be called every time the app becomes active
      // The actual logic for showing popup is handled in the component
    },
  });

  return {
    isFirstAppOpenToday,
  };
}
