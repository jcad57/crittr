import { useAuth } from "@/context/auth";
import { Redirect, Stack, usePathname, useSegments } from "expo-router";

export default function AuthLayout() {
  const { isLoggedIn, needsOnboarding } = useAuth();
  const segments = useSegments();
  const pathname = usePathname();
  const isOnOnboarding =
    segments.some((s) => s === "(onboarding)") ||
    (pathname?.includes("(onboarding)") ?? false);

  if (isLoggedIn && !needsOnboarding) {
    return <Redirect href="/(logged-in)/dashboard" />;
  }

  if (isLoggedIn && needsOnboarding && !isOnOnboarding) {
    return <Redirect href="/(auth)/(onboarding)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="(onboarding)" />
    </Stack>
  );
}
