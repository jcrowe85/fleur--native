import React from "react";
import { View } from "react-native";
import useBottomSpace from "./useBottomSpace";

export default function BottomSpacer({ extra = 12 }: { extra?: number }) {
  const h = useBottomSpace(extra);
  return <View style={{ height: h }} />;
}
