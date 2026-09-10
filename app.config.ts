// app.config.ts
import { ExpoConfig } from "expo/config";

/**
 * Marketing version. Bump for every store submission.
 * iOS buildNumber and Android versionCode are managed remotely by EAS
 * (`"autoIncrement": true` in eas.json), so they are intentionally not pinned
 * here — pinning them means every submission after the first is rejected as a
 * duplicate build number.
 */
const VERSION = "1.0.0";

const config: ExpoConfig = {
  name: "Fleur",
  slug: "fleur",
  scheme: "fleur",
  version: VERSION,
  orientation: "portrait",
  userInterfaceStyle: "dark",
  newArchEnabled: true,

  // Required for a store build: without an icon the app ships with the default
  // Expo placeholder, which is an automatic rejection on both stores.
  icon: "./assets/icon.png",

  splash: {
    image: "./assets/logo.png",
    backgroundColor: "#0D0D0D",
    resizeMode: "contain",
  },

  assetBundlePatterns: ["**/*"],

  plugins: [
    "expo-router",
    "expo-secure-store",
    [
      "expo-notifications",
      {
        // Adds POST_NOTIFICATIONS on Android 13+. Without the plugin the
        // permission is never declared, so notifications silently never appear
        // for the majority of current Android devices.
        icon: "./assets/adaptive-icon.png",
        color: "#0D0D0D",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "Fleur uses your photos so you can add a profile picture and share progress photos with the community.",
        cameraPermission:
          "Fleur uses your camera so you can take progress photos of your hair.",
      },
    ],
    [
      "expo-contacts",
      {
        contactsPermission:
          "Fleur uses your contacts so you can invite friends and earn referral rewards. Contacts are never uploaded.",
      },
    ],
  ],

  web: { bundler: "metro" },

  ios: {
    bundleIdentifier: "com.tryfleur.app",
    userInterfaceStyle: "dark",
    supportsTablet: false,
    infoPlist: {
      // App Review rejects builds whose permission prompts have no purpose
      // string, and the plugin-generated ones above only cover their own APIs.
      NSPhotoLibraryUsageDescription:
        "Fleur uses your photos so you can add a profile picture and share progress photos with the community.",
      NSCameraUsageDescription:
        "Fleur uses your camera so you can take progress photos of your hair.",
      NSContactsUsageDescription:
        "Fleur uses your contacts so you can invite friends and earn referral rewards. Contacts are never uploaded.",
      NSUserTrackingUsageDescription:
        "Fleur does not track you across other apps or websites.",
      ITSAppUsesNonExemptEncryption: false,
    },
  },

  android: {
    package: "com.tryfleur.app",
    userInterfaceStyle: "dark",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#0D0D0D",
    },
    edgeToEdgeEnabled: true,
    // Explicit allow-list. The generated manifest previously also carried
    // RECORD_AUDIO, SYSTEM_ALERT_WINDOW and WRITE_EXTERNAL_STORAGE, none of
    // which the app uses; SYSTEM_ALERT_WINDOW in particular requires a
    // Play Console declaration and depresses install conversion.
    permissions: [
      "android.permission.INTERNET",
      "android.permission.POST_NOTIFICATIONS",
      "android.permission.READ_CONTACTS",
      "android.permission.VIBRATE",
      "android.permission.READ_MEDIA_IMAGES",
    ],
    blockedPermissions: [
      "android.permission.RECORD_AUDIO",
      "android.permission.SYSTEM_ALERT_WINDOW",
      "android.permission.WRITE_CONTACTS",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.READ_EXTERNAL_STORAGE",
    ],
  },

  extra: {
    eas: {
      // Populated by `eas init`. notificationService skips push registration
      // when this is absent rather than throwing.
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
};

export default config;
