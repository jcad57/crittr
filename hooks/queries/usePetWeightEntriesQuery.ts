import { fetchPetWeightEntries } from "@/services/petWeightEntries";
import type { PetWeightEntry } from "@/types/database";
import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { petWeightEntriesQueryKey } from "./queryKeys";

export function usePetWeightEntriesQuery(
  petId: string | null | undefined,
): UseQueryResult<PetWeightEntry[], Error> {
  return useQuery<PetWeightEntry[], Error>({
    queryKey: petWeightEntriesQueryKey(petId ?? ""),
    queryFn: () => fetchPetWeightEntries(petId!),
    enabled: !!petId,
  });
}
