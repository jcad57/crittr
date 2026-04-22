import { fetchAllergiesForPetType } from "@/services/reference";
import type { CommonAllergy } from "@/types/database";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { allergiesQueryKey } from "./queryKeys";

/** Common allergies for a pet type. Reference data rarely changes — cache for 24h. */
const DAY_MS = 24 * 60 * 60 * 1000;

export function useAllergiesQuery(
  petType: string | null | undefined,
): UseQueryResult<CommonAllergy[], Error> {
  return useQuery<CommonAllergy[], Error>({
    queryKey: allergiesQueryKey(petType ?? ""),
    queryFn: () => fetchAllergiesForPetType(petType!),
    enabled: !!petType,
    staleTime: DAY_MS,
    gcTime: DAY_MS,
  });
}
