import { queryClient } from "@/lib/query/client";
import { fetchAccessiblePets, fetchPetProfile } from "@/services/pets";
import { useAuthStore } from "@/stores/authStore";
import type { PetWithDetails, PetWithRole } from "@/types/database";
import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { warmPetDetailsCache } from "./prefetchPetsAndDetails";
import { petDetailsQueryKey, petsQueryKey } from "@/lib/query/keys";

/**
 * All pets the logged-in user has access to (owned + co-cared).
 *
 * Warm only the selected pet; other detail queries load when their screens are opened.
 */
export function usePetsQuery(): UseQueryResult<PetWithRole[], Error> {
  const userId = useAuthStore((s) => s.session?.user?.id);

  const query = useQuery<PetWithRole[], Error>({
    queryKey: petsQueryKey(userId ?? ""),
    queryFn: ({ signal }) => fetchAccessiblePets(userId!, signal),
    retry: 1,
    enabled: !!userId,
  });

  const pets = query.data;
  useEffect(() => {
    if (!pets?.length) return;
    const selected = pets.find((p) => p.is_active) ?? pets[0];
    if (selected) void warmPetDetailsCache(queryClient, [selected]);
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
