import { useAuth } from "@/context/auth";
import { Redirect, Stack } from "expo-router";

export default function AuthLayout() {
  const { isLoggedIn, needsOnboarding } = useAuth();

  if (isLoggedIn && !needsOnboarding) {
    return <Redirect href="/(logged-in)/dashboard" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="(onboarding)" />
    </Stack>
  );
}
