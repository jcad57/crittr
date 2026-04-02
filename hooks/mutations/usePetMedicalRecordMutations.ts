import { queryClient } from "@/lib/queryClient";
import {
  createPetMedicalRecordWithFiles,
  deleteMedicalRecordFile,
  deletePetMedicalRecord,
  type UploadMedicalRecordFileInput,
  updatePetMedicalRecordTitle,
  uploadFileToMedicalRecord,
} from "@/services/petMedicalRecords";
import type { PetMedicalRecordFile } from "@/types/database";
import { useMutation } from "@tanstack/react-query";
import {
  petMedicalRecordDetailQueryKey,
  petMedicalRecordsQueryKey,
} from "../queries/queryKeys";

export function useCreatePetMedicalRecordWithFilesMutation(petId: string) {
  return useMutation({
    mutationFn: (input: {
      userId: string;
      recordTitle: string;
      files: Omit<
        UploadMedicalRecordFileInput,
        "petId" | "medicalRecordId" | "userId"
      >[];
    }) =>
      createPetMedicalRecordWithFiles(
        petId,
        input.userId,
        input.recordTitle,
        input.files,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: petMedicalRecordsQueryKey(petId),
      });
    },
  });
}

export function useUploadMedicalRecordFileMutation(
  petId: string,
  medicalRecordId: string,
) {
  return useMutation({
    mutationFn: (
      input: Omit<UploadMedicalRecordFileInput, "petId" | "medicalRecordId">,
    ) =>
      uploadFileToMedicalRecord({
        ...input,
        petId,
        medicalRecordId,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: petMedicalRecordsQueryKey(petId),
      });
      void queryClient.invalidateQueries({
        queryKey: petMedicalRecordDetailQueryKey(medicalRecordId),
      });
    },
  });
}

export function useDeleteMedicalRecordFileMutation(
  petId: string,
  medicalRecordId: string,
) {
  return useMutation({
    mutationFn: (file: PetMedicalRecordFile) =>
      deleteMedicalRecordFile(file),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: petMedicalRecordsQueryKey(petId),
      });
      void queryClient.invalidateQueries({
        queryKey: petMedicalRecordDetailQueryKey(medicalRecordId),
      });
    },
  });
}

export function useDeletePetMedicalRecordMutation(petId: string) {
  return useMutation({
    mutationFn: (recordId: string) => deletePetMedicalRecord(recordId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: petMedicalRecordsQueryKey(petId),
      });
    },
  });
}

export function useUpdatePetMedicalRecordTitleMutation(petId: string) {
  return useMutation({
    mutationFn: ({ recordId, title }: { recordId: string; title: string }) =>
      updatePetMedicalRecordTitle(recordId, title),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: petMedicalRecordsQueryKey(petId),
      });
      void queryClient.invalidateQueries({
        queryKey: petMedicalRecordDetailQueryKey(variables.recordId),
      });
    },
  });
}
