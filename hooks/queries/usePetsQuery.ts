import { queryClient } from "@/lib/queryClient";
import { fetchPetProfile, fetchUserPets } from "@/services/pets";
import { useAuthStore } from "@/stores/authStore";
import type { Pet, PetWithDetails } from "@/types/database";
import {
  type UseQueryResult,
  useQuery,
} from "@tanstack/react-query";
import { petDetailsQueryKey, petsQueryKey } from "./queryKeys";

/**
 * All pets belonging to the logged-in user.
 * Automatically prefetches details for every pet in the background.
 */
export function usePetsQuery(): UseQueryResult<Pet[], Error> {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useQuery<Pet[], Error>({
    queryKey: petsQueryKey(userId ?? ""),
    queryFn: async () => {
      const pets = await fetchUserPets(userId!);

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
