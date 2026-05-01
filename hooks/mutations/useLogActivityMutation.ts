import { queryClient } from "@/lib/queryClient";
import {
  logExercise,
  logFood,
  logMaintenance,
  logMedication,
  logPotty,
  logTraining,
} from "@/services/activities";
import {
  allActivitiesKey,
  healthSnapshotKey,
  petDetailsQueryKey,
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
} from "@/types/database";
import { useMutation } from "@tanstack/react-query";

function invalidateLoggedActivityCaches(petId: string) {
  void queryClient.invalidateQueries({
    queryKey: todayActivitiesPrefixKey(petId),
  });
  void queryClient.invalidateQueries({ queryKey: allActivitiesKey(petId) });
  void queryClient.invalidateQueries({
    queryKey: activitiesSincePrefixKey(petId),
  });
}

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
      invalidateLoggedActivityCaches(variables.petId);
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
      invalidateLoggedActivityCaches(variables.petId);
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
      invalidateLoggedActivityCaches(petId);
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
        invalidateLoggedActivityCaches(petId);
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
        invalidateLoggedActivityCaches(petId);
      }
    },
  });
}

export function useLogMaintenanceMutation(petId: string | null) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: (payload: {
      form: MaintenanceActivityFormData;
      loggedAtIso: string;
    }) => {
      if (!petId || !userId) throw new Error("Missing pet or user");
      return logMaintenance(petId, userId, payload.form, {
        loggedAt: payload.loggedAtIso,
      });
    },
    onSuccess: () => {
      if (petId) {
        invalidateLoggedActivityCaches(petId);
      }
    },
  });
}
