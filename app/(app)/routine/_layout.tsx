// app/(app)/routine/_layout.tsx
import { Stack } from "expo-router";

export default function RoutineLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="customize" />
      {/* add analytics, etc. here later */}
    </Stack>
  );
}
