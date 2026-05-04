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
import {
  type UpdatePetDetailsInput,
  type UpdatePetExerciseRequirementsInput,
  type UpdatePetNameAndBreedInput,
  updatePetDetails,
  updatePetExerciseRequirements,
  updatePetNameAndBreed,
} from "@/services/pets";
import type { PetWithDetails } from "@/types/database";
import { useAuthStore } from "@/stores/authStore";
import { useMutation } from "@tanstack/react-query";

export function useUpdatePetExerciseRequirementsMutation(petId: string) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: (fields: UpdatePetExerciseRequirementsInput) =>
      updatePetExerciseRequirements(petId, fields),
    onSuccess: (updated) => {
      /**
       * Server return merges into the cached `PetWithDetails` without changing
       * nested arrays, so there's no need to also invalidate `petDetailsQueryKey`.
       */
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
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: petsQueryKey(userId) });
        void queryClient.invalidateQueries({
          queryKey: healthSnapshotKey(userId),
        });
      }
    },
  });
}

export function useUpdatePetNameAndBreedMutation(petId: string) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: (fields: UpdatePetNameAndBreedInput) =>
      updatePetNameAndBreed(petId, fields),
    onSuccess: (updated) => {
      /**
       * Name/breed change only touches base pet fields — the optimistic merge
       * already matches what `fetchPetProfile` would return next, so we skip
       * invalidating `petDetailsQueryKey` here. `petsQueryKey` (list view)
       * still needs a refetch because it renders the pet name.
       */
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
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: petsQueryKey(userId) });
        void queryClient.invalidateQueries({
          queryKey: healthSnapshotKey(userId),
        });
      }
    },
  });
}

export function useUpdatePetDetailsMutation(petId: string) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: (fields: UpdatePetDetailsInput) =>
      updatePetDetails(petId, fields),
    onSuccess: (updated) => {
      /**
       * Server return merges cleanly into `PetWithDetails` (nested arrays are
       * preserved), so no follow-up invalidation of `petDetailsQueryKey` is
       * needed. List + health snapshot still need refreshing since they
       * surface pet-level fields.
       */
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
