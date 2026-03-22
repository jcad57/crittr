import { useAuthStore } from "@/stores/authStore";

/**
 * Thin hook that exposes the Zustand auth store.
 * Keeps the existing `useAuth()` API so every consumer
 * continues to work without import changes.
 */
export function useAuth() {
  const {
    isLoggedIn,
    isLoading,
    needsOnboarding,
    session,
    profile,
    signOut,
  } = useAuthStore();

  return {
    isLoggedIn,
    isLoading,
    needsOnboarding,
    session,
    profile,
    signIn: () => {},
    signOut,
  };
}
