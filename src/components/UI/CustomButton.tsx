// src/components/UI/CustomButton.tsx
import React from "react";
import { Pressable, Text, Platform, View, ViewStyle } from "react-native";
import { cn } from "../../lib/cn";

type Props = {
  variant?: "wellness" | "ghost" | "primary";
  fleurSize?: "sm" | "default" | "lg";
  className?: string;
  onPress?: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
};

const shadowWellness: ViewStyle =
  Platform.OS === "ios"
    ? { shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } }
    : { elevation: 8 };

const shadowSubtle: ViewStyle =
  Platform.OS === "ios"
    ? { shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }
    : { elevation: 3 };

export function CustomButton({
  variant = "primary",
  fleurSize = "default",
  className,
  onPress,
  disabled,
  children,
}: Props) {
  const size =
    fleurSize === "lg" ? "h-14 px-8 rounded-full"
    : fleurSize === "sm" ? "h-10 px-5 rounded-full"
    : "h-12 px-7 rounded-full";

  const base = "items-center justify-center active:opacity-90";

  const bg =
    variant === "wellness" ? "bg-white"
    : variant === "ghost" ? "bg-white/10 border border-white/30"
    : "bg-[#0D0D0D]";

  const textColor = variant === "wellness" ? "text-black" : "text-white";

  const containerShadow: ViewStyle | undefined =
    variant === "wellness" ? shadowWellness
    : variant === "ghost" ? shadowSubtle
    : undefined;

  // Render children:
  // - If it's a single string/number => wrap in Text
  // - If it's mixed (string + icons, multiple nodes) => map and wrap only text nodes
  const renderContent = () => {
    const arr = React.Children.toArray(children);

    if (arr.length === 1 && (typeof arr[0] === "string" || typeof arr[0] === "number")) {
      return <Text className={cn(textColor, "font-semibold")}>{arr[0]}</Text>;
    }

    return (
      <View className="flex-row items-center">
        {arr.map((child, idx) =>
          typeof child === "string" || typeof child === "number" ? (
            <Text key={idx} className={cn(textColor, "font-semibold")}>
              {child}
            </Text>
          ) : (
            <View key={idx} style={idx > 0 ? { marginLeft: 8 } : undefined}>
              {child}
            </View>
          )
        )}
      </View>
    );
  };

  return (
    <Pressable
      className={cn(base, size, bg, disabled && "opacity-50", className)}
      style={containerShadow}
      onPress={onPress}
      disabled={disabled}
      android_ripple={{ color: "rgba(255,255,255,0.12)" }}
    >
      {renderContent()}
    </Pressable>
  );
}

export default CustomButton;