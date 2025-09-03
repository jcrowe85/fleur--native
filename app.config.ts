// app.config.ts
import { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Fleur",
  slug: "fleur",
  scheme: "fleur",

  userInterfaceStyle: "automatic", // ✅ fixes the warning

  splash: {
    image: "./assets/logo.png",
    backgroundColor: "#0D0D0D",
    resizeMode: "contain",
  },

  plugins: ["expo-router"],
  web: { bundler: "metro" },

  android: {
    package: "com.tryfleur.app",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#0D0D0D",
    },
  },
  ios: { bundleIdentifier: "com.tryfleur.app" },
};

export default config;
