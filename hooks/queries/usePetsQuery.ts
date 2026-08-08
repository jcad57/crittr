import { queryClient } from "@/lib/queryClient";
import { fetchAccessiblePets, fetchPetProfile } from "@/services/pets";
import { useAuthStore } from "@/stores/authStore";
import type { PetWithDetails, PetWithRole } from "@/types/database";
import {
  type UseQueryResult,
  useQuery,
} from "@tanstack/react-query";
import { useEffect } from "react";
import { warmPetDetailsCache } from "./prefetchPetsAndDetails";
import { petDetailsQueryKey, petsQueryKey } from "./queryKeys";

/**
 * All pets the logged-in user has access to (owned + co-cared).
 *
 * Each pet's full details are warmed in the background off the result, so
 * switching pets or opening a pet profile has nothing left to wait on.
 */
export function usePetsQuery(): UseQueryResult<PetWithRole[], Error> {
  const userId = useAuthStore((s) => s.session?.user?.id);

  const query = useQuery<PetWithRole[], Error>({
    queryKey: petsQueryKey(userId ?? ""),
    queryFn: () => fetchAccessiblePets(userId!),
    enabled: !!userId,
  });

  const pets = query.data;
  useEffect(() => {
    if (!pets?.length) return;
    void warmPetDetailsCache(queryClient, pets);
  }, [pets]);

  return query;
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
