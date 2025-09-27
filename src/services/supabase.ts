// Polyfills first
import "react-native-url-polyfill/auto";
import "react-native-get-random-values";

import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

// SecureStore adapter with error handling
const ExpoSecureStoreAdapter = {
  getItem: async (k: string) => {
    try {
      return await SecureStore.getItemAsync(k);
    } catch (error) {
      console.warn('SecureStore getItem failed:', error);
      return null;
    }
  },
  setItem: async (k: string, v: string) => {
    try {
      await SecureStore.setItemAsync(k, v);
    } catch (error) {
      console.warn('SecureStore setItem failed:', error);
    }
  },
  removeItem: async (k: string) => {
    try {
      await SecureStore.deleteItemAsync(k);
    } catch (error) {
      console.warn('SecureStore removeItem failed:', error);
    }
  },
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: ExpoSecureStoreAdapter as any,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      // Add error handling for auth state changes
      onAuthStateChange: (event, session) => {
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
        }
      },
    },
  }
);

// Add global error handler for Supabase auth errors
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED' && !session) {
    console.warn('Token refresh failed - session lost');
  }
});
