import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/auth";
import { useOnboardingStore } from "@/stores/onboardingStore";
import {
  Redirect,
  Stack,
  useGlobalSearchParams,
  usePathname,
  useSegments,
} from "expo-router";

export default function AuthLayout() {
  const { isLoggedIn, needsOnboarding } = useAuth();
  const emailVerificationPending = useOnboardingStore(
    (s) => s.emailVerificationPending,
  );
  const skipOnboardingGuestRedirect = useOnboardingStore(
    (s) => s.skipOnboardingGuestRedirect,
  );
  const segments = useSegments();
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ intent?: string | string[] }>();
  const intentRaw = params.intent;
  const intent = Array.isArray(intentRaw) ? intentRaw[0] : intentRaw;

  const isOnOnboarding =
    segments.some((s) => s === "(onboarding)") ||
    (pathname?.includes("(onboarding)") ?? false);

  if (isLoggedIn && !needsOnboarding) {
    return <Redirect href="/(logged-in)/(tabs)/dashboard" />;
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
  if (
    !isLoggedIn &&
    isOnOnboarding &&
    intent !== "signup" &&
    !emailVerificationPending &&
    !skipOnboardingGuestRedirect
  ) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.splashBackground },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="(onboarding)" />
    </Stack>
  );
}
