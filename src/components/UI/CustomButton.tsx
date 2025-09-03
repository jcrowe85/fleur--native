// src/components/UI/CustomButton.tsx
import React from "react";
import { Pressable, Text, Platform, ViewStyle } from "react-native";
import { cn } from "../../lib/cn"; // or your existing helper

type Props = {
  variant?: "wellness" | "ghost" | "primary";
  fleurSize?: "sm" | "default" | "lg";
  className?: string;
  onPress?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
};

const shadowWellness: ViewStyle =
  Platform.OS === "ios"
    ? {
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
      }
    : { elevation: 8 };

const shadowSubtle: ViewStyle =
  Platform.OS === "ios"
    ? {
        shadowColor: "#000",
        shadowOpacity: 0.10,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      }
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
    fleurSize === "lg"
      ? "h-14 px-8 rounded-full"
      : fleurSize === "sm"
      ? "h-10 px-5 rounded-full"
      : "h-12 px-7 rounded-full";

  const base = "items-center justify-center active:opacity-90";

  // Explicit RN-friendly colors (no CSS variables)
  const bg =
    variant === "wellness"
      ? "bg-white"
      : variant === "ghost"
      ? "bg-white/10 border border-white/30"
      : "bg-[#0D0D0D]";

  const text =
    variant === "wellness" ? "text-black" : "text-white";

  const style: ViewStyle | undefined =
    variant === "wellness"
      ? shadowWellness
      : variant === "ghost"
      ? shadowSubtle
      : undefined;

  return (
    <Pressable
      className={cn(base, size, bg, disabled && "opacity-50", className)}
      style={style}
      onPress={onPress}
      disabled={disabled}
    >
      <Text className={cn("", text)}>{children}</Text>
    </Pressable>
  );
}

export default CustomButton;
