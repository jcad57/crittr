import { fetchAccessiblePets, fetchPetProfile } from "@/services/pets";
import type { QueryClient } from "@tanstack/react-query";
import { petDetailsQueryKey, petsQueryKey } from "./queryKeys";

/**
 * Fetch the accessible-pets list and prefetch each pet's full details in the
 * background. Shared between `usePetsQuery` and `useLoggedInQueryBootstrap` so
 * both paths have identical throttling + cache behavior (skip details that
 * are already cached).
 */
export async function fetchAccessiblePetsAndPrefetchDetails(
  queryClient: QueryClient,
  userId: string,
) {
  const pets = await fetchAccessiblePets(userId);

  for (const pet of pets) {
    const key = petDetailsQueryKey(pet.id);
    if (queryClient.getQueryData(key) != null) continue;
    void queryClient.prefetchQuery({
      queryKey: key,
      queryFn: () => fetchPetProfile(pet.id),
    });
  }

  return pets;
}

/** Prefetch the accessible-pets list (+ each pet's details) into the cache. */
export function prefetchPetsAndDetails(
  queryClient: QueryClient,
  userId: string,
): Promise<void> {
  return queryClient.prefetchQuery({
    queryKey: petsQueryKey(userId),
    queryFn: () => fetchAccessiblePetsAndPrefetchDetails(queryClient, userId),
  });
}
