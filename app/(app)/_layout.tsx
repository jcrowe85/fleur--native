// app/(app)/_layout.tsx
import React, { useEffect } from "react";
import { Tabs, router } from "expo-router";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import {
  Platform,
  Pressable,
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Text,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

// Use RELATIVE imports to avoid alias issues
import { resetLocalData } from "../../src/dev/resetLocalData";
import { CommentsSheetProvider } from "../../src/features/community/commentsSheet";
import { PickHandleSheetProvider } from "../../src/features/community/pickHandleSheet";
import { useAuthStore } from "../../src/state/authStore";

function ProfileButton() {
  return (
    <Pressable
      onPress={() => router.push("/(app)/profile")}
      onLongPress={
        __DEV__
          ? () => {
              Alert.alert(
                "Reset local data?",
                "This will clear your plan and onboarding answers stored on this device.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Reset",
                    style: "destructive",
                    onPress: async () => {
                      try {
                        await resetLocalData();
                      } catch (e) {
                        console.warn("Reset failed:", e);
                      }
                    },
                  },
                ]
              );
            }
          : undefined
      }
      delayLongPress={600}
      hitSlop={10}
      style={styles.headerBtn}
    >
      <Feather name="user" size={20} color="#fff" />
    </Pressable>
  );
}

export default function AppLayout() {
  const { bootstrap, loading, error } = useAuthStore();

  useEffect(() => {
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <View style={styles.centerWrap}>
        <View style={styles.cardShadow}>
          <BlurView intensity={90} tint="dark" style={styles.centerCard}>
            <View style={StyleSheet.absoluteFillObject as any} />
            <ActivityIndicator />
            <Text style={styles.centerText}>Preparing your space…</Text>
          </BlurView>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerWrap}>
        <View style={styles.cardShadow}>
          <BlurView intensity={90} tint="dark" style={styles.centerCard}>
            <Text style={styles.errorText}>Couldn’t connect. Please try again.</Text>
            <Pressable onPress={bootstrap} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </BlurView>
        </View>
      </View>
    );
  }

  return (
    <PickHandleSheetProvider>
      <CommentsSheetProvider>
        <Tabs
          screenOptions={{
            headerTransparent: true,
            headerTitle: "",
            headerTintColor: "#fff",
            headerShadowVisible: false,
            headerStyle: { backgroundColor: "transparent" },
            headerRight: () => <ProfileButton />,
            headerLeft: () => null,
            tabBarShowLabel: false,
          }}
          tabBar={(props) => <FleurTabBar {...props} />}
        >
          {/* Visible tabs */}
          <Tabs.Screen name="dashboard" options={{ title: "Dashboard", tabBarIcon: () => null }} />
          <Tabs.Screen name="routine"   options={{ title: "Routine",   tabBarIcon: () => null }} />
          <Tabs.Screen name="shop"      options={{ title: "Shop",      tabBarIcon: () => null }} />
          <Tabs.Screen name="education" options={{ title: "Education", tabBarIcon: () => null }} />
          <Tabs.Screen name="community" options={{ title: "Community", tabBarIcon: () => null }} />

          {/* Hide non-tab routes inside this group */}
          {/* Removed: <Tabs.Screen name="article" options={{ href: null }} /> */}
          <Tabs.Screen name="profile" options={{ href: null }} />
        </Tabs>
      </CommentsSheetProvider>
    </PickHandleSheetProvider>
  );
}

/** Whitelisted custom tab bar — only renders the 5 intended tabs */
function FleurTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // Only these show up as tabs; anything else (e.g., profile) is ignored
  const TAB_NAMES = ["dashboard", "routine", "shop", "education", "community"] as const;
  const routes = state.routes.filter((r) => TAB_NAMES.includes(r.name as any));

  const iconFor = (name: string): keyof typeof Feather.glyphMap => {
    switch (name) {
      case "dashboard": return "home";
      case "routine":   return "calendar";
      case "shop":      return "shopping-bag";
      case "education": return "book-open";
      case "community": return "users";
      default:          return "circle";
    }
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}
    >
      <View style={styles.pillShadow}>
        <BlurView intensity={Platform.OS === "ios" ? 90 : 90} tint="dark" style={styles.pill}>
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(10,10,10,0.22)" }]}
          />
          <View style={styles.row}>
            {routes.map((route) => {
              // find original index to compute focus state
              const routeIndex = state.routes.findIndex((r) => r.key === route.key);
              const isFocused = state.index === routeIndex;

              const onPress = () => {
                const e = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !e.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              return (
                <Pressable key={route.key} onPress={onPress} style={styles.iconBtn}>
                  <View style={styles.iconSlot}>
                    {isFocused && <View style={styles.focusBg} />}
                    <Feather
                      name={iconFor(route.name)}
                      size={22}
                      color={isFocused ? "#fff" : "rgba(255,255,255,0.72)"}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    marginRight: 12,
    padding: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  // ----- glass loader / error -----
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  cardShadow: {
    width: "86%",
    maxWidth: 420,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  centerCard: {
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
    alignItems: "center",
    overflow: "hidden",
  },
  centerText: {
    marginTop: 10,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
  errorText: {
    color: "rgba(255,255,255,0.95)",
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
  },

  // ----- tab bar -----
  wrap: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
    alignItems: "center",
  },
  pillShadow: {
    width: "92%",
    maxWidth: 460,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  pill: {
    borderRadius: 24,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  iconBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  iconSlot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  focusBg: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
});
