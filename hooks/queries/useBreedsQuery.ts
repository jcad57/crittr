import { fetchBreedsForPetType } from "@/services/reference";
import type { Breed } from "@/types/database";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { breedsQueryKey } from "./queryKeys";

/** Breeds for a pet type. Reference data rarely changes — cache for 24h. */
const DAY_MS = 24 * 60 * 60 * 1000;

export function useBreedsQuery(
  petType: string | null | undefined,
): UseQueryResult<Breed[], Error> {
  return useQuery<Breed[], Error>({
    queryKey: breedsQueryKey(petType ?? ""),
    queryFn: () => fetchBreedsForPetType(petType!),
    enabled: !!petType,
    staleTime: DAY_MS,
    gcTime: DAY_MS,
  });
}
