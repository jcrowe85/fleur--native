import { Platform } from "react-native";

const DEFAULT_LOCAL =
  Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";

const raw = process.env.EXPO_PUBLIC_API_BASE ?? DEFAULT_LOCAL;

// Optional sanity checks
if (__DEV__) {
  if (!raw) console.warn("EXPO_PUBLIC_API_BASE missing; using default local.");
  if (!/^https?:\/\//.test(raw)) console.warn("API_BASE looks invalid:", raw);
}

export const API_BASE = raw;
