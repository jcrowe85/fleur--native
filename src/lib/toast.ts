// src/lib/toast.ts
import { Platform, ToastAndroid, Alert } from "react-native";

export function showToast(message: string) {
  if (!message) return;
  if (Platform.OS === "android") {
    try {
      ToastAndroid.show(message, ToastAndroid.SHORT);
      return;
    } catch {}
  }
  // iOS & web fallback: lightweight alert (replace later with a custom overlay if you want)
  try {
    Alert.alert("", message);
  } catch {}
}
