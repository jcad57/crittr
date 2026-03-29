import { healthSnapshotKey, petDetailsQueryKey } from "@/hooks/queries/queryKeys";
import { queryClient } from "@/lib/queryClient";
import {
  deletePetMedication,
  insertPetMedication,
  type UpdatePetMedicationInput,
  updatePetMedication,
} from "@/services/medications";
import { useAuthStore } from "@/stores/authStore";
import { useMutation } from "@tanstack/react-query";

export function useInsertMedicationMutation(petId: string) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: (input: UpdatePetMedicationInput) =>
      insertPetMedication(petId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: petDetailsQueryKey(petId) });
      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: healthSnapshotKey(userId),
        });
      }
    },
  });
}

export function useUpdateMedicationMutation(petId: string) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: async ({
      medicationId,
      updates,
    }: {
      medicationId: string;
      updates: UpdatePetMedicationInput;
    }) => updatePetMedication(petId, medicationId, updates),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: petDetailsQueryKey(petId) });
      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: healthSnapshotKey(userId),
        });
      }
    },
  });
}

export function useDeleteMedicationMutation(petId: string) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: async (medicationId: string) =>
      deletePetMedication(petId, medicationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: petDetailsQueryKey(petId) });
      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: healthSnapshotKey(userId),
        });
      }
    },
  });
}
