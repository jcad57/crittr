import { Redirect, Stack } from "expo-router";

import { useAuth } from "@/context/auth";

/**
 * Auth group layout.
 * Guard: if a session already exists, skip this whole group
 * and send the user straight to their dashboard.
 */
export default function AuthLayout() {
  const { isLoggedIn } = useAuth();

  if (isLoggedIn) {
    return <Redirect href="/(logged-in)/dashboard" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
    </Stack>
  );
}
