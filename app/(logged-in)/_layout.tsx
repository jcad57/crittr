import { useAuth } from "@/context/auth";
import { Redirect, Stack } from "expo-router";

export default function LoggedInLayout() {
  const { isLoggedIn, needsOnboarding } = useAuth();

  if (!isLoggedIn) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (needsOnboarding) {
    return <Redirect href="/(auth)/(onboarding)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
