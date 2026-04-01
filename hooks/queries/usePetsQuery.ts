import { queryClient } from "@/lib/queryClient";
import { fetchAccessiblePets, fetchPetProfile } from "@/services/pets";
import { useAuthStore } from "@/stores/authStore";
import type { PetWithDetails, PetWithRole } from "@/types/database";
import {
  type UseQueryResult,
  useQuery,
} from "@tanstack/react-query";
import { petDetailsQueryKey, petsQueryKey } from "./queryKeys";

/**
 * All pets the logged-in user has access to (owned + co-cared).
 * Automatically prefetches details for every pet in the background.
 */
export function usePetsQuery(): UseQueryResult<PetWithRole[], Error> {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useQuery<PetWithRole[], Error>({
    queryKey: petsQueryKey(userId ?? ""),
    queryFn: async () => {
      const pets = await fetchAccessiblePets(userId!);

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
    enabled: !!userId,
  });
}

/** Full details for a single pet. */
export function usePetDetailsQuery(
  petId: string | null | undefined,
): UseQueryResult<PetWithDetails | null, Error> {
  return useQuery<PetWithDetails | null, Error>({
    queryKey: petDetailsQueryKey(petId ?? ""),
    queryFn: () => fetchPetProfile(petId!),
    enabled: !!petId,
  });
}
