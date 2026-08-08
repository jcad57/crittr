import { fetchPetMedicalRecordDetail } from "@/services/petMedicalRecords";
import { useQuery } from "@tanstack/react-query";
import { petMedicalRecordDetailQueryKey } from "@/lib/query/keys";

export function usePetMedicalRecordDetailQuery(recordId: string | undefined) {
  return useQuery({
    queryKey: petMedicalRecordDetailQueryKey(recordId ?? ""),
    queryFn: () => fetchPetMedicalRecordDetail(recordId!),
    enabled: Boolean(recordId),
  });
}
