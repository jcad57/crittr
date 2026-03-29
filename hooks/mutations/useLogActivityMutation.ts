import { queryClient } from "@/lib/queryClient";
import {
  logExercise,
  logFood,
  logMedication,
  logVetVisit,
} from "@/services/activities";
import {
  allActivitiesKey,
  todayActivitiesPrefixKey,
} from "@/hooks/queries/queryKeys";
import { useAuthStore } from "@/stores/authStore";
import type {
  ExerciseFormData,
  FoodActivityFormData,
  MedicationActivityFormData,
  VetVisitActivityFormData,
} from "@/types/database";
import { useMutation } from "@tanstack/react-query";

export function useLogExerciseMutation(petId: string | null) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: (form: ExerciseFormData) => {
      if (!petId || !userId) throw new Error("Missing pet or user");
      return logExercise(petId, userId, form);
    },
    onSuccess: () => {
      if (petId) {
        queryClient.invalidateQueries({ queryKey: todayActivitiesPrefixKey(petId) });
        queryClient.invalidateQueries({ queryKey: allActivitiesKey(petId) });
        queryClient.invalidateQueries({ queryKey: ["todayActivities"] });
      }
    },
  });
}

export function useLogFoodMutation(petId: string | null) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: (form: FoodActivityFormData) => {
      if (!petId || !userId) throw new Error("Missing pet or user");
      return logFood(petId, userId, form);
    },
    onSuccess: () => {
      if (petId) {
        queryClient.invalidateQueries({ queryKey: todayActivitiesPrefixKey(petId) });
        queryClient.invalidateQueries({ queryKey: allActivitiesKey(petId) });
        queryClient.invalidateQueries({ queryKey: ["todayActivities"] });
      }
    },
  });
}

export function useLogMedicationMutation(petId: string | null) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: (form: MedicationActivityFormData) => {
      if (!petId || !userId) throw new Error("Missing pet or user");
      return logMedication(petId, userId, form);
    },
    onSuccess: () => {
      if (petId) {
        queryClient.invalidateQueries({ queryKey: todayActivitiesPrefixKey(petId) });
        queryClient.invalidateQueries({ queryKey: allActivitiesKey(petId) });
        queryClient.invalidateQueries({ queryKey: ["todayActivities"] });
      }
    },
  });
}

export function useLogVetVisitMutation(petId: string | null) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: (payload: {
      form: VetVisitActivityFormData;
      allPetIds: string[];
    }) => {
      if (!petId || !userId) throw new Error("Missing pet or user");
      return logVetVisit(petId, userId, payload.form, payload.allPetIds);
    },
    onSuccess: () => {
      if (petId) {
        queryClient.invalidateQueries({ queryKey: todayActivitiesPrefixKey(petId) });
        queryClient.invalidateQueries({ queryKey: allActivitiesKey(petId) });
        queryClient.invalidateQueries({ queryKey: ["todayActivities"] });
      }
    },
  });
}
