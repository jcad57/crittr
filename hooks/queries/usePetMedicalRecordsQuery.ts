import { fetchPetMedicalRecordsList } from "@/services/petMedicalRecords";
import type { PetMedicalRecord } from "@/types/database";
import { useQuery } from "@tanstack/react-query";
import { petMedicalRecordsQueryKey } from "@/lib/query/keys";

export type PetMedicalRecordsListData = {
  records: PetMedicalRecord[];
  fileCounts: Map<string, number>;
};

export function usePetMedicalRecordsQuery(petId: string | undefined) {
  return useQuery({
    queryKey: petMedicalRecordsQueryKey(petId ?? ""),
    queryFn: (): Promise<PetMedicalRecordsListData> =>
      fetchPetMedicalRecordsList(petId!),
    enabled: Boolean(petId),
  });
}
