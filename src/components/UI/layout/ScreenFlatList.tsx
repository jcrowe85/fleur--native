import React from "react";
import { FlatList, FlatListProps } from "react-native";
import useBottomSpace from "./useBottomSpace";

export default function ScreenFlatList<T>(props: FlatListProps<T> & { extraBottom?: number }) {
  const { contentContainerStyle, extraBottom = 16, ...rest } = props as any;
  const bottomSpace = useBottomSpace(extraBottom);
  return (
    <FlatList
      {...rest}
      contentContainerStyle={[{ paddingBottom: bottomSpace }, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
    />
  );
}
