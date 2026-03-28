import { fetchProfile } from "@/services/profiles";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";
import { profileQueryKey } from "./queryKeys";

/**
 * Current user's profile from the `profiles` table.
 * Uses Zustand `auth.profile` as initial cache when IDs match (aligned with bootstrap hydration).
 */
export function useProfileQuery() {
  const userId = useAuthStore((s) => s.session?.user?.id);
  const profileFromAuth = useAuthStore((s) => s.profile);

  const initial =
    userId && profileFromAuth?.id === userId ? profileFromAuth : undefined;

  return useQuery({
    queryKey: profileQueryKey(userId ?? ""),
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
    initialData: initial,
    /** Treat hydrated Zustand snapshot as stale so we still sync from the server on mount. */
    initialDataUpdatedAt: initial ? 0 : undefined,
  });
}
