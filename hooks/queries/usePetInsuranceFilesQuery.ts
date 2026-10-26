import { fetchPetInsuranceFiles } from "@/services/petInsurance";
import { useQuery } from "@tanstack/react-query";
import { petInsuranceFilesQueryKey } from "@/lib/query/keys";

export function usePetInsuranceFilesQuery(petId: string | undefined) {
  return useQuery({
    queryKey: petInsuranceFilesQueryKey(petId ?? ""),
    queryFn: () => fetchPetInsuranceFiles(petId!),
    enabled: Boolean(petId),
  });
}
