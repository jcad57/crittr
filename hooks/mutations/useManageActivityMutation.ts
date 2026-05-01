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
} from "@/services/activities";
import {
  allActivitiesKey,
  petActivityQueryKey,
  todayActivitiesPrefixKey,
  activitiesSincePrefixKey,
} from "@/hooks/queries/queryKeys";
import type {
  ExerciseFormData,
  FoodActivityFormData,
  MaintenanceActivityFormData,
  MedicationActivityFormData,
  PottyActivityFormData,
  TrainingActivityFormData,
  VetVisitActivityFormData,
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

export function useDeleteActivityMutation(petId: string | null) {
  return useMutation({
    mutationFn: (activityId: string) => deletePetActivity(activityId),
    onSuccess: (_, activityId) => invalidateActivityCaches(petId, activityId),
  });
}
