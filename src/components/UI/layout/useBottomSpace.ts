import * as React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";

/** Returns safe-area bottom + bottom tab bar height (0 if not in a tab). */
export default function useBottomSpace(extra = 0) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = React.useContext(BottomTabBarHeightContext) ?? 0;
  return insets.bottom + tabBarHeight + extra;
}
