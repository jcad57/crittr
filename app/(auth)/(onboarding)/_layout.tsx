import { Colors } from "@/constants/colors";
import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.splashBackground },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="co-care-removed" />
    </Stack>
  );
}
