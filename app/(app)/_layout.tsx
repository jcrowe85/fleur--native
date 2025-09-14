// app/(app)/_layout.tsx
import React from "react";
import { Tabs, router } from "expo-router";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { Platform, Pressable, View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

function ProfileButton() {
  return (
    <Pressable
      onPress={() => router.push("/(app)/profile")}
      hitSlop={10}
      style={styles.headerBtn}
    >
      <Feather name="user" size={20} color="#fff" />
    </Pressable>
  );
}

export default function AppLayout() {
  return (
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
      <Tabs.Screen name="dashboard" options={{ title: "Dashboard", tabBarIcon: () => null }} />
      <Tabs.Screen name="routine"   options={{ title: "Routine",   tabBarIcon: () => null }} />
      <Tabs.Screen name="shop"      options={{ title: "Shop",      tabBarIcon: () => null }} />
      <Tabs.Screen name="learn"     options={{ title: "Learn",     tabBarIcon: () => null }} />
      <Tabs.Screen name="community" options={{ title: "Community", tabBarIcon: () => null }} />
    </Tabs>
  );
}

function FleurTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const iconFor = (name: string): keyof typeof Feather.glyphMap => {
    switch (name) {
      case "dashboard": return "home";
      case "routine":   return "calendar";
      case "shop":      return "shopping-bag";
      case "learn":     return "book-open";
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
        <BlurView
          intensity={Platform.OS === "ios" ? 90 : 90}
          tint="dark"
          style={styles.pill}
        >
          {/* dark matte so content underneath doesn't show through too much */}
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(10,10,10,0.10)" }]}
          />
          <View style={styles.row}>
            {state.routes.map((route, index) => {
              const isFocused = state.index === index;

              const onPress = () => {
                const e = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!isFocused && !e.defaultPrevented) navigation.navigate(route.name);
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
    backgroundColor: "rgba(255,255,255,0.12)",
  },
});
