import {
  healthSnapshotKey,
  petDetailsQueryKey,
  petInsuranceFilesQueryKey,
  petsQueryKey,
} from "@/hooks/queries/queryKeys";
import { queryClient } from "@/lib/queryClient";
import {
  deletePetInsuranceFile,
  type UploadPetInsuranceFileInput,
  uploadPetInsuranceFile,
} from "@/services/petInsurance";
import {
  type UpdatePetInsuranceInput,
  updatePetInsurance,
} from "@/services/pets";
import type { PetInsuranceFile, PetWithDetails } from "@/types/database";
import { useAuthStore } from "@/stores/authStore";
import { useMutation } from "@tanstack/react-query";

export function useUploadPetInsuranceFileMutation(petId: string) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: (
      input: Omit<UploadPetInsuranceFileInput, "petId" | "userId">,
    ) => {
      if (!userId) throw new Error("Not signed in");
      return uploadPetInsuranceFile({
        ...input,
        petId,
        userId,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: petInsuranceFilesQueryKey(petId),
      });
    },
  });
}

export function useDeletePetInsuranceFileMutation(petId: string) {
  return useMutation({
    mutationFn: (file: PetInsuranceFile) => deletePetInsuranceFile(file),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: petInsuranceFilesQueryKey(petId),
      });
    },
  });
}

export function useUpdatePetInsuranceMutation(petId: string) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: (input: UpdatePetInsuranceInput) =>
      updatePetInsurance(petId, input),
    onSuccess: (updated) => {
      queryClient.setQueryData<PetWithDetails | null>(
        petDetailsQueryKey(petId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            ...updated,
            foods: old.foods,
            medications: old.medications,
            vaccinations: old.vaccinations,
            exercise: old.exercise,
          };
        },
      );
      void queryClient.invalidateQueries({ queryKey: petDetailsQueryKey(petId) });
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: petsQueryKey(userId) });
        void queryClient.invalidateQueries({
          queryKey: healthSnapshotKey(userId),
        });
      }
    },
  });
}
