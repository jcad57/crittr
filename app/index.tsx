import { useAuth } from "@/context/auth";
import { Redirect } from "expo-router";

export default function Index() {
  const { isLoggedIn, needsOnboarding } = useAuth();

  if (isLoggedIn && !needsOnboarding) {
    return <Redirect href="/(logged-in)/dashboard" />;
  }

  if (isLoggedIn && needsOnboarding) {
    return <Redirect href="/(auth)/(onboarding)" />;
  }

  return <Redirect href="/(auth)/welcome" />;
}
