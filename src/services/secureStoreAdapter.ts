import * as SecureStore from "expo-secure-store";

export const SecureStoreAdapter = {
  getItem: async (key: string) => {
    try { return (await SecureStore.getItemAsync(key)) ?? null; }
    catch { return null; }
  },
  setItem: async (key: string, value: string) => {
    try { await SecureStore.setItemAsync(key, value); } catch {}
  },
  removeItem: async (key: string) => {
    try { await SecureStore.deleteItemAsync(key); } catch {}
  },
};
