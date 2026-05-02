import { queryClient } from "@/lib/queryClient";
import {
  deletePetActivity,
  updateExerciseActivity,
  updateFoodActivity,
  updateMaintenanceActivity,
  updateMedicationActivity,
  updatePottyActivity,
  updateTrainingActivity,
  updateVetVisitActivity,
  updateWeighInActivity,
} from "@/services/activities";
import { deletePetWeightEntry } from "@/services/petWeightEntries";
import {
  allActivitiesKey,
  petActivityQueryKey,
  petDetailsQueryKey,
  petsQueryKey,
  petWeightEntriesQueryKey,
  todayActivitiesPrefixKey,
  activitiesSincePrefixKey,
} from "@/hooks/queries/queryKeys";
import { useAuthStore } from "@/stores/authStore";
import type {
  ExerciseFormData,
  FoodActivityFormData,
  MaintenanceActivityFormData,
  MedicationActivityFormData,
  PottyActivityFormData,
  TrainingActivityFormData,
  VetVisitActivityFormData,
  WeighInActivityFormData,
} from "@/types/database";
import { useMutation } from "@tanstack/react-query";

function invalidateActivityCaches(petId: string | null, activityId: string) {
  queryClient.invalidateQueries({ queryKey: petActivityQueryKey(activityId) });
  if (petId) {
    queryClient.invalidateQueries({ queryKey: todayActivitiesPrefixKey(petId) });
    queryClient.invalidateQueries({ queryKey: allActivitiesKey(petId) });
    queryClient.invalidateQueries({
      queryKey: activitiesSincePrefixKey(petId),
    });
  } else {
    /**
     * Only fall back to the bare prefix when the caller didn't pass a pet id;
     * otherwise the scoped invalidation above is sufficient.
     */
    queryClient.invalidateQueries({ queryKey: ["todayActivities"] });
  }
}

export function useUpdateExerciseActivityMutation(petId: string | null) {
  return useMutation({
    mutationFn: ({
      activityId,
      form,
    }: {
      activityId: string;
      form: ExerciseFormData;
    }) => updateExerciseActivity(activityId, form),
    onSuccess: (_, { activityId }) =>
      invalidateActivityCaches(petId, activityId),
  });
}

export function useUpdateFoodActivityMutation(petId: string | null) {
  return useMutation({
    mutationFn: ({
      activityId,
      form,
    }: {
      activityId: string;
      form: FoodActivityFormData;
    }) => updateFoodActivity(activityId, form),
    onSuccess: (_, { activityId }) =>
      invalidateActivityCaches(petId, activityId),
  });
}

export function useUpdateMedicationActivityMutation(petId: string | null) {
  return useMutation({
    mutationFn: ({
      activityId,
      form,
    }: {
      activityId: string;
      form: MedicationActivityFormData;
    }) => updateMedicationActivity(activityId, form),
    onSuccess: (_, { activityId }) =>
      invalidateActivityCaches(petId, activityId),
  });
}

export function useUpdateVetVisitActivityMutation(petId: string | null) {
  return useMutation({
    mutationFn: ({
      activityId,
      form,
    }: {
      activityId: string;
      form: VetVisitActivityFormData;
    }) => updateVetVisitActivity(activityId, form),
    onSuccess: (_, { activityId }) =>
      invalidateActivityCaches(petId, activityId),
  });
}

export function useUpdateTrainingActivityMutation(petId: string | null) {
  return useMutation({
    mutationFn: ({
      activityId,
      form,
      loggedAtIso,
    }: {
      activityId: string;
      form: TrainingActivityFormData;
      loggedAtIso?: string;
    }) =>
      updateTrainingActivity(activityId, form, {
        loggedAt: loggedAtIso,
      }),
    onSuccess: (_, { activityId }) =>
      invalidateActivityCaches(petId, activityId),
  });
}

export function useUpdatePottyActivityMutation(petId: string | null) {
  return useMutation({
    mutationFn: ({
      activityId,
      form,
      loggedAtIso,
    }: {
      activityId: string;
      form: PottyActivityFormData;
      loggedAtIso?: string;
    }) =>
      updatePottyActivity(activityId, form, {
        loggedAt: loggedAtIso,
      }),
    onSuccess: (_, { activityId }) =>
      invalidateActivityCaches(petId, activityId),
  });
}

export function useUpdateMaintenanceActivityMutation(petId: string | null) {
  return useMutation({
    mutationFn: ({
      activityId,
      form,
      loggedAtIso,
    }: {
      activityId: string;
      form: MaintenanceActivityFormData;
      loggedAtIso?: string;
    }) =>
      updateMaintenanceActivity(activityId, form, {
        loggedAt: loggedAtIso,
      }),
    onSuccess: (_, { activityId }) =>
      invalidateActivityCaches(petId, activityId),
  });
}

export function useUpdateWeighInActivityMutation(petId: string | null) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: ({
      activityId,
      form,
      loggedAtIso,
    }: {
      activityId: string;
      form: WeighInActivityFormData;
      loggedAtIso?: string;
    }) =>
      updateWeighInActivity(activityId, form, {
        loggedAt: loggedAtIso,
      }),
    onSuccess: (_, { activityId }) => {
      invalidateActivityCaches(petId, activityId);
      if (petId) {
        void queryClient.invalidateQueries({
          queryKey: petWeightEntriesQueryKey(petId),
        });
        void queryClient.invalidateQueries({
          queryKey: petDetailsQueryKey(petId),
        });
      }
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: petsQueryKey(userId) });
      }
    },
  });
}

export function useDeleteActivityMutation(petId: string | null) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: (activityId: string) => deletePetActivity(activityId),
    onSuccess: (_, activityId) => {
      invalidateActivityCaches(petId, activityId);
      /** Weigh-in activities cascade-delete the linked pet_weight_entries row,
       * so refresh the chart whether or not this was a weigh-in. */
      if (petId) {
        void queryClient.invalidateQueries({
          queryKey: petWeightEntriesQueryKey(petId),
        });
        void queryClient.invalidateQueries({
          queryKey: petDetailsQueryKey(petId),
        });
      }
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: petsQueryKey(userId) });
      }
    },
  });
}

/**
 * Delete a single weigh-in entry directly from `pet_weight_entries`. The
 * matching `pet_activities` row is removed via the FK cascade, so we
 * invalidate both the chart's data and the activity feed.
 */
export function useDeletePetWeightEntryMutation(petId: string | null) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: (entryId: string) => deletePetWeightEntry(entryId),
    onSuccess: () => {
      if (petId) {
        void queryClient.invalidateQueries({
          queryKey: todayActivitiesPrefixKey(petId),
        });
        void queryClient.invalidateQueries({ queryKey: allActivitiesKey(petId) });
        void queryClient.invalidateQueries({
          queryKey: activitiesSincePrefixKey(petId),
        });
        void queryClient.invalidateQueries({
          queryKey: petWeightEntriesQueryKey(petId),
        });
        void queryClient.invalidateQueries({
          queryKey: petDetailsQueryKey(petId),
        });
      }
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: petsQueryKey(userId) });
      }
    },
  });
}
