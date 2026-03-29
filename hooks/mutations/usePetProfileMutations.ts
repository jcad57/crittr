import {
  healthSnapshotKey,
  petDetailsQueryKey,
  petsQueryKey,
} from "@/hooks/queries/queryKeys";
import { queryClient } from "@/lib/queryClient";
import {
  deletePetFood,
  insertPetFood,
  type UpsertPetFoodInput,
  updatePetFood,
} from "@/services/petFoods";
import { type UpdatePetDetailsInput, updatePetDetails } from "@/services/pets";
import type { PetWithDetails } from "@/types/database";
import { useAuthStore } from "@/stores/authStore";
import { useMutation } from "@tanstack/react-query";

export function useUpdatePetDetailsMutation(petId: string) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: (fields: UpdatePetDetailsInput) =>
      updatePetDetails(petId, fields),
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

export function useInsertPetFoodMutation(petId: string) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: (input: UpsertPetFoodInput) => insertPetFood(petId, input),
    onSuccess: () => {
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

export function useUpdatePetFoodMutation(petId: string) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: ({
      foodId,
      input,
    }: {
      foodId: string;
      input: UpsertPetFoodInput;
    }) => updatePetFood(petId, foodId, input),
    onSuccess: () => {
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

export function useDeletePetFoodMutation(petId: string) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: (foodId: string) => deletePetFood(petId, foodId),
    onSuccess: () => {
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
