import React from "react";
import { ScrollView, ScrollViewProps } from "react-native";
import useBottomSpace from "./useBottomSpace";

type Props = ScrollViewProps & { extraBottom?: number };

export default function ScreenScroll({ children, contentContainerStyle, extraBottom = 16, ...rest }: Props) {
  const bottomSpace = useBottomSpace(extraBottom);
  return (
    <ScrollView
      {...rest}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[{ paddingBottom: bottomSpace }, contentContainerStyle]}
    >
      {children}
    </ScrollView>
  );
}
