import { useAuthStore } from "@/stores/authStore";

/**
 * Thin hook that exposes the Zustand auth store with granular selectors.
 * Each field is subscribed individually so consumers only re-render when
 * the specific fields they read actually change.
 */
export function useAuth() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isHydrating = useAuthStore((s) => s.isHydrating);
  const needsOnboarding = useAuthStore((s) => s.needsOnboarding);
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);

  return {
    isLoggedIn,
    isLoading,
    isHydrating,
    needsOnboarding,
    session,
    profile,
    signOut,
  };
}
