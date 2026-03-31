import { healthSnapshotKey, petDetailsQueryKey } from "@/hooks/queries/queryKeys";
import { queryClient } from "@/lib/queryClient";
import {
  createPetVaccination,
  deletePetVaccination,
  type CreatePetVaccinationInput,
  type UpdatePetVaccinationInput,
  updatePetVaccination,
} from "@/services/health";
import type { PetVaccination, PetWithDetails } from "@/types/database";
import { useAuthStore } from "@/stores/authStore";
import { useMutation } from "@tanstack/react-query";

function mergeVaccinationsIntoPetDetailsCache(
  petId: string,
  updater: (vacs: PetVaccination[]) => PetVaccination[],
) {
  if (!petId) return;
  queryClient.setQueryData<PetWithDetails | null>(
    petDetailsQueryKey(petId),
    (old) => {
      if (!old) return old;
      return { ...old, vaccinations: updater(old.vaccinations) };
    },
  );
}

export function useInsertPetVaccinationMutation(petId: string) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: (input: Omit<CreatePetVaccinationInput, "pet_id">) =>
      createPetVaccination({ ...input, pet_id: petId }),
    onSuccess: (created) => {
      mergeVaccinationsIntoPetDetailsCache(petId, (vacs) => [...vacs, created]);
      void queryClient.invalidateQueries({ queryKey: petDetailsQueryKey(petId) });
      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: healthSnapshotKey(userId),
        });
      }
    },
  });
}

export function useUpdatePetVaccinationMutation(petId: string) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: async ({
      vaccinationId,
      updates,
    }: {
      vaccinationId: string;
      updates: UpdatePetVaccinationInput;
    }) => updatePetVaccination(petId, vaccinationId, updates),
    onSuccess: (updated) => {
      mergeVaccinationsIntoPetDetailsCache(petId, (vacs) =>
        vacs.map((v) => (v.id === updated.id ? updated : v)),
      );
      void queryClient.invalidateQueries({ queryKey: petDetailsQueryKey(petId) });
      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: healthSnapshotKey(userId),
        });
      }
    },
  });
}

export function useDeletePetVaccinationMutation(petId: string) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: async (vaccinationId: string) =>
      deletePetVaccination(petId, vaccinationId),
    onSuccess: (_, vaccinationId) => {
      mergeVaccinationsIntoPetDetailsCache(petId, (vacs) =>
        vacs.filter((v) => v.id !== vaccinationId),
      );
      void queryClient.invalidateQueries({ queryKey: petDetailsQueryKey(petId) });
      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: healthSnapshotKey(userId),
        });
      }
    },
  });
}
