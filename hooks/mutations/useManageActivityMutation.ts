import { queryClient } from "@/lib/queryClient";
import {
  deletePetActivity,
  updateExerciseActivity,
  updateFoodActivity,
  updateMedicationActivity,
  updateVetVisitActivity,
} from "@/services/activities";
import {
  allActivitiesKey,
  petActivityQueryKey,
  todayActivitiesKey,
} from "@/hooks/queries/queryKeys";
import type {
  ExerciseFormData,
  FoodActivityFormData,
  MedicationActivityFormData,
  VetVisitActivityFormData,
} from "@/types/database";
import { useMutation } from "@tanstack/react-query";

function invalidateActivityCaches(petId: string | null, activityId: string) {
  queryClient.invalidateQueries({ queryKey: petActivityQueryKey(activityId) });
  queryClient.invalidateQueries({ queryKey: ["todayActivities"] });
  if (petId) {
    queryClient.invalidateQueries({ queryKey: todayActivitiesKey(petId) });
    queryClient.invalidateQueries({ queryKey: allActivitiesKey(petId) });
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

export function useDeleteActivityMutation(petId: string | null) {
  return useMutation({
    mutationFn: (activityId: string) => deletePetActivity(activityId),
    onSuccess: (_, activityId) => invalidateActivityCaches(petId, activityId),
  });
}
