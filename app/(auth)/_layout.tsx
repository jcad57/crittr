import { useAuth } from "@/context/auth";
import { useAuthStore } from "@/stores/authStore";
import {
  Redirect,
  Stack,
  useGlobalSearchParams,
  usePathname,
  useSegments,
} from "expo-router";

export default function AuthLayout() {
  const { isLoggedIn, needsOnboarding } = useAuth();
  const requiresCoCareRemovedScreen = useAuthStore(
    (s) => s.requiresCoCareRemovedScreen,
  );
  const segments = useSegments();
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ intent?: string | string[] }>();
  const intentRaw = params.intent;
  const intent = Array.isArray(intentRaw) ? intentRaw[0] : intentRaw;

  const isOnOnboarding =
    segments.some((s) => s === "(onboarding)") ||
    (pathname?.includes("(onboarding)") ?? false);
  const isOnCoCareRemoved = pathname?.includes("co-care-removed") ?? false;

  if (isLoggedIn && !needsOnboarding) {
    return <Redirect href="/(logged-in)/dashboard" />;
  }

  if (
    isLoggedIn &&
    needsOnboarding &&
    requiresCoCareRemovedScreen &&
    !isOnCoCareRemoved
  ) {
    return <Redirect href="/(auth)/(onboarding)/co-care-removed" />;
  }

  if (isLoggedIn && needsOnboarding && !isOnOnboarding) {
    return <Redirect href="/(auth)/(onboarding)" />;
  }

  /**
   * Cold reload restores the last URL; guests often land on `/(auth)/(onboarding)`
   * without meaning to (stale route after sign-out). Only allow the sign-up flow
   * when explicitly opened from Welcome or Sign-in with `?intent=signup`.
   * Logged-in onboarding is handled above.
   */
  if (!isLoggedIn && isOnOnboarding && !isOnCoCareRemoved && intent !== "signup") {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="(onboarding)" />
    </Stack>
  );
}
