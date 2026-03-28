import { fetchPetVetVisits } from "@/services/health";
import { useQuery } from "@tanstack/react-query";
import { petVetVisitsQueryKey } from "./queryKeys";

export function usePetVetVisitsQuery(petId: string | undefined) {
  return useQuery({
    queryKey: petVetVisitsQueryKey(petId ?? ""),
    queryFn: () => fetchPetVetVisits(petId!),
    enabled: Boolean(petId),
  });
}
