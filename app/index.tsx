import { useAuth } from "@/context/auth";
import { useAuthStore } from "@/stores/authStore";
import { Redirect } from "expo-router";

export default function Index() {
  const { isLoggedIn, needsOnboarding } = useAuth();
  const requiresCoCareRemovedScreen = useAuthStore(
    (s) => s.requiresCoCareRemovedScreen,
  );

  if (isLoggedIn && !needsOnboarding) {
    return <Redirect href="/(logged-in)/(tabs)/dashboard" />;
  }

  if (isLoggedIn && needsOnboarding && requiresCoCareRemovedScreen) {
    return <Redirect href="/(auth)/(onboarding)/co-care-removed" />;
  }

  if (isLoggedIn && needsOnboarding) {
    return <Redirect href="/(auth)/(onboarding)" />;
  }

  return <Redirect href="/(auth)/welcome" />;
}
