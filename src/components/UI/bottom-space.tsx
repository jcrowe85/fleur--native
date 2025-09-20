import * as React from "react";
import { FlatList, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
// This hook exists when you’re inside a BottomTab navigator (expo-router Tabs)
let useBottomTabBarHeight: (() => number) | undefined;
try {
  // Optional dependency: only used if available
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  useBottomTabBarHeight = require("@react-navigation/bottom-tabs").useBottomTabBarHeight;
} catch {
  // no-op if package/hook isn’t available
}

/** Compute bottom padding that prevents content from being hidden under the tab bar. */
export function useBottomSpace(extra: number = 16) {
  const insets = useSafeAreaInsets();
  let tabH = 0;
  try {
    tabH = useBottomTabBarHeight ? useBottomTabBarHeight() : 0;
  } catch {
    tabH = 0;
  }
  return insets.bottom + tabH + extra;
}

/** ScrollView with smart bottom padding */
export const ScreenScrollView = React.forwardRef<any, any>((props, ref) => {
  const { bottomExtra = 16, contentContainerStyle, ...rest } = props;
  const padBottom = useBottomSpace(bottomExtra);
  return (
    <ScrollView
      ref={ref}
      {...rest}
      contentContainerStyle={[contentContainerStyle, { paddingBottom: padBottom }]}
    />
  );
});
ScreenScrollView.displayName = "ScreenScrollView";

/** FlatList with smart bottom padding (generic-friendly) */
function ScreenFlatListInner<T>(props: any, ref: any) {
  const { bottomExtra = 16, contentContainerStyle, ...rest } = props;
  const padBottom = useBottomSpace(bottomExtra);
  return (
    <FlatList
      ref={ref}
      {...rest}
      contentContainerStyle={[contentContainerStyle, { paddingBottom: padBottom }]}
    />
  );
}
// Preserve generics at the call site: <ScreenFlatList<ItemType> ... />
export const ScreenFlatList = React.forwardRef(ScreenFlatListInner) as unknown as
  (<T>(props: React.ComponentProps<typeof FlatList<T>> & { bottomExtra?: number }) => JSX.Element);
(ScreenFlatList as any).displayName = "ScreenFlatList";
