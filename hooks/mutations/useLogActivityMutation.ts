import { queryClient } from "@/lib/queryClient";
import {
  logExercise,
  logFood,
  logMedication,
  logPotty,
  logTraining,
} from "@/services/activities";
import {
  allActivitiesKey,
  healthSnapshotKey,
  petDetailsQueryKey,
  todayActivitiesPrefixKey,
} from "@/hooks/queries/queryKeys";
import { useAuthStore } from "@/stores/authStore";
import type {
  ExerciseFormData,
  FoodActivityFormData,
  MedicationActivityFormData,
  PottyActivityFormData,
  TrainingActivityFormData,
} from "@/types/database";
import { useMutation } from "@tanstack/react-query";

export function useLogExerciseMutation() {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: (payload: {
      petId: string;
      form: ExerciseFormData;
      loggedAtIso: string;
    }) => {
      if (!userId) throw new Error("Not signed in");
      return logExercise(payload.petId, userId, payload.form, {
        loggedAt: payload.loggedAtIso,
      });
    },
    onSuccess: (_data, variables) => {
      const petId = variables.petId;
      void queryClient.invalidateQueries({
        queryKey: todayActivitiesPrefixKey(petId),
      });
      void queryClient.invalidateQueries({ queryKey: allActivitiesKey(petId) });
      void queryClient.invalidateQueries({ queryKey: ["todayActivities"] });
    },
  });
}

export function useLogFoodMutation() {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: (payload: {
      petId: string;
      form: FoodActivityFormData;
      loggedAtIso: string;
    }) => {
      if (!userId) throw new Error("Not signed in");
      return logFood(payload.petId, userId, payload.form, {
        loggedAt: payload.loggedAtIso,
      });
    },
    onSuccess: (_data, variables) => {
      const petId = variables.petId;
      void queryClient.invalidateQueries({
        queryKey: todayActivitiesPrefixKey(petId),
      });
      void queryClient.invalidateQueries({ queryKey: allActivitiesKey(petId) });
      void queryClient.invalidateQueries({ queryKey: ["todayActivities"] });
    },
  });
}

export function useLogMedicationMutation() {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: (payload: {
      petId: string;
      form: MedicationActivityFormData;
      loggedAtIso: string;
    }) => {
      if (!userId) throw new Error("Not signed in");
      return logMedication(payload.petId, userId, payload.form, {
        loggedAt: payload.loggedAtIso,
      });
    },
    onSuccess: (_data, variables) => {
      const petId = variables.petId;
      void queryClient.invalidateQueries({
        queryKey: todayActivitiesPrefixKey(petId),
      });
      void queryClient.invalidateQueries({ queryKey: allActivitiesKey(petId) });
      void queryClient.invalidateQueries({ queryKey: ["todayActivities"] });
      void queryClient.invalidateQueries({
        queryKey: petDetailsQueryKey(petId),
      });
      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: healthSnapshotKey(userId),
        });
      }
    },
  });
}

export function useLogTrainingMutation(petId: string | null) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: (payload: {
      form: TrainingActivityFormData;
      loggedAtIso: string;
    }) => {
      if (!petId || !userId) throw new Error("Missing pet or user");
      return logTraining(petId, userId, payload.form, {
        loggedAt: payload.loggedAtIso,
      });
    },
    onSuccess: () => {
      if (petId) {
        queryClient.invalidateQueries({
          queryKey: todayActivitiesPrefixKey(petId),
        });
        queryClient.invalidateQueries({ queryKey: allActivitiesKey(petId) });
        queryClient.invalidateQueries({ queryKey: ["todayActivities"] });
      }
    },
  });
}

export function useLogPottyMutation(petId: string | null) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: (payload: {
      form: PottyActivityFormData;
      loggedAtIso: string;
    }) => {
      if (!petId || !userId) throw new Error("Missing pet or user");
      return logPotty(petId, userId, payload.form, {
        loggedAt: payload.loggedAtIso,
      });
    },
    onSuccess: () => {
      if (petId) {
        queryClient.invalidateQueries({
          queryKey: todayActivitiesPrefixKey(petId),
        });
        queryClient.invalidateQueries({ queryKey: allActivitiesKey(petId) });
        queryClient.invalidateQueries({ queryKey: ["todayActivities"] });
      }
    },
  });
}
