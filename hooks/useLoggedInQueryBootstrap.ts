import { queryClient } from "@/lib/queryClient";
import { fetchPetProfile, fetchUserPets } from "@/services/pets";
import { fetchProfile } from "@/services/profiles";
import { useAuthStore } from "@/stores/authStore";
import { useEffect } from "react";
import {
  healthSnapshotKey,
  petDetailsQueryKey,
  petsQueryKey,
  profileQueryKey,
} from "@/hooks/queries/queryKeys";
import { fetchOwnerHealthSnapshot } from "@/services/health";

/**
 * Warm TanStack Query cache on mount for the logged-in session:
 * - Hydrates `profile` from Zustand (auth) so React Query matches client state.
 * - Prefetches profile + pets list + each pet’s details (same pattern as `usePetsQuery`).
 */
export function useLoggedInQueryBootstrap() {
  const userId = useAuthStore((s) => s.session?.user?.id);

  useEffect(() => {
    if (!userId) return;

    const { profile } = useAuthStore.getState();
    if (profile) {
      queryClient.setQueryData(profileQueryKey(userId), profile);
    }

    void queryClient.prefetchQuery({
      queryKey: profileQueryKey(userId),
      queryFn: () => fetchProfile(userId),
    });

    void queryClient.prefetchQuery({
      queryKey: petsQueryKey(userId),
      queryFn: async () => {
        const pets = await fetchUserPets(userId);
        for (const pet of pets) {
          const key = petDetailsQueryKey(pet.id);
          if (queryClient.getQueryData(key) != null) continue;
          void queryClient.prefetchQuery({
            queryKey: key,
            queryFn: () => fetchPetProfile(pet.id),
          });
        }
        return pets;
      },
    });

    void queryClient.prefetchQuery({
      queryKey: healthSnapshotKey(userId),
      queryFn: () => fetchOwnerHealthSnapshot(userId),
    });
  }, [userId]);
}
