import { Colors } from "@/constants/colors";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

/**
 * OAuth deep-link return route (e.g. `crittr://auth/callback?code=...`).
 *
 * On the happy path `WebBrowser.openAuthSessionAsync` already intercepted the
 * URL and `signInWithGoogle()` is hydrating the new session — the layout's
 * `<Redirect>` will fire as soon as `isLoggedIn` flips and we never mount
 * here. This screen is only reached when the OS routes the deep link into
 * the app independently (some Android browsers / launchers).
 *
 * Behaviour:
 *  - If hydration is in progress (or completes successfully) → router lands
 *    on dashboard / onboarding via `<Redirect>` in `(auth)/_layout.tsx`.
 *  - If neither hydration nor a logged-in session arrives within
 *    `WAIT_MS`, fall back to `/welcome` so the user isn't stuck on a
 *    spinner.
 */
const WAIT_MS = 20_000;

export default function OAuthCallback() {
  const router = useRouter();
  const routedRef = useRef(false);

  useEffect(() => {
    routedRef.current = false;

    const tryRoute = () => {
      if (routedRef.current) return false;
      const { isLoggedIn, isHydrating, needsOnboarding, requiresCoCareRemovedScreen } =
        useAuthStore.getState();

      if (isHydrating) return false;
      if (!isLoggedIn) return false;

      routedRef.current = true;
      if (!needsOnboarding) {
        router.replace("/(logged-in)/(tabs)/dashboard");
      } else if (requiresCoCareRemovedScreen) {
        router.replace("/(auth)/(onboarding)/co-care-removed");
      } else {
        router.replace("/(auth)/(onboarding)?intent=signup");
      }
      return true;
    };

    tryRoute();

    const unsub = useAuthStore.subscribe((state, prev) => {
      const becameLoggedIn = state.isLoggedIn && !prev.isLoggedIn;
      const finishedHydrating = prev.isHydrating && !state.isHydrating;
      if (becameLoggedIn || finishedHydrating) tryRoute();
    });

    const fallbackTimer = setTimeout(() => {
      if (!routedRef.current) {
        routedRef.current = true;
        router.replace("/(auth)/welcome");
      }
    }, WAIT_MS);

    return () => {
      clearTimeout(fallbackTimer);
      unsub();
    };
  }, [router]);

  return (
    <View style={styles.shell}>
      <ActivityIndicator />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.splashBackground,
  },
});
