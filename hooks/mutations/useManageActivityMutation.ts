import { queryClient } from "@/lib/query/client";
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
import { syncScheduleItemsLinkedToActivity } from "@/services/schedule";
import {
  allActivitiesKey,
  petActivityQueryKey,
  petDetailsQueryKey,
  petsQueryKey,
  petWeightEntriesQueryKey,
  todayActivitiesPrefixKey,
  activitiesSincePrefixKey,
  scheduleDayKey,
  schedulePetPrefixKey,
} from "@/lib/query/keys";
import { useAuthStore } from "@/stores/authStore";
import type {
  ExerciseFormData,
  FoodActivityFormData,
  MaintenanceActivityFormData,
  MedicationActivityFormData,
  PetActivity,
  PetScheduleItem,
  PottyActivityFormData,
  TrainingActivityFormData,
  VetVisitActivityFormData,
  WeighInActivityFormData,
} from "@/types/database";
import {
  scheduleDisplayFieldsFromActivity,
  withFoodBrand,
} from "@/utils/scheduleDisplayFromActivity";
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
    queryClient.invalidateQueries({ queryKey: ["todayActivities"] });
  }
}

function patchScheduleCachesFromActivity(
  activity: PetActivity,
  options?: { foodBrand?: string | null },
) {
  let fields = scheduleDisplayFieldsFromActivity(activity);
  if (activity.activity_type === "food") {
    fields = withFoodBrand(fields, options?.foodBrand);
  }

  const patchRow = (row: PetScheduleItem): PetScheduleItem => {
    if (row.activity_id !== activity.id) return row;
    const next: PetScheduleItem = {
      ...row,
      label: fields.label,
      quantity_line: fields.quantity_line,
      notes: fields.notes,
    };
    if (
      fields.detail_line != null ||
      activity.activity_type !== "food" ||
      options?.foodBrand?.trim()
    ) {
      next.detail_line = fields.detail_line;
    }
    return next;
  };

  queryClient.setQueriesData<PetScheduleItem[]>(
    { queryKey: schedulePetPrefixKey(activity.pet_id) },
    (old) => (old ? old.map(patchRow) : old),
  );

  // Also catch any day keys that might not match prefix shape edge cases.
  queryClient.setQueriesData<PetScheduleItem[]>(
    { queryKey: ["schedule", activity.pet_id] },
    (old) => (old ? old.map(patchRow) : old),
  );
}

async function syncScheduleAfterActivityEdit(
  activity: PetActivity,
  options?: { foodBrand?: string | null },
) {
  patchScheduleCachesFromActivity(activity, options);
  try {
    const rows = await syncScheduleItemsLinkedToActivity(activity, options);
    for (const row of rows) {
      queryClient.setQueryData<PetScheduleItem[]>(
        scheduleDayKey(row.pet_id, row.local_date),
        (old) =>
          old
            ? old.map((r) => (r.id === row.id ? row : r))
            : old,
      );
    }
  } catch (e) {
    if (__DEV__) console.warn("[schedule] sync after activity edit", e);
  }
}

function invalidateHouseholdMaintenanceRollups() {
  void queryClient.invalidateQueries({
    predicate: (q) => {
      const k = q.queryKey;
      return (
        Array.isArray(k) &&
        k.length >= 2 &&
        k[1] === "multi" &&
        (k[0] === "todayActivities" || k[0] === "activitiesSince")
      );
    },
  });
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
    onSuccess: (activity, { activityId }) => {
      invalidateActivityCaches(petId, activityId);
      void syncScheduleAfterActivityEdit(activity);
    },
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
    onSuccess: (activity, { activityId, form }) => {
      invalidateActivityCaches(petId, activityId);
      void syncScheduleAfterActivityEdit(activity, {
        foodBrand: form.foodBrand,
      });
    },
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
    onSuccess: (activity, { activityId }) => {
      invalidateActivityCaches(petId, activityId);
      void syncScheduleAfterActivityEdit(activity);
    },
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
    onSuccess: (activity, { activityId }) => {
      invalidateActivityCaches(petId, activityId);
      void syncScheduleAfterActivityEdit(activity);
    },
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
    onSuccess: (activity, { activityId }) => {
      invalidateActivityCaches(petId, activityId);
      void syncScheduleAfterActivityEdit(activity);
    },
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
    onSuccess: (activity, { activityId }) => {
      invalidateActivityCaches(petId, activityId);
      void syncScheduleAfterActivityEdit(activity);
    },
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
    onSuccess: (activity, { activityId }) => {
      invalidateActivityCaches(petId, activityId);
      invalidateHouseholdMaintenanceRollups();
      void syncScheduleAfterActivityEdit(activity);
    },
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
    onSuccess: (activity, { activityId }) => {
      invalidateActivityCaches(petId, activityId);
      void syncScheduleAfterActivityEdit(activity);
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
      if (petId) {
        // Linked schedule rows clear activity_id via FK; refresh schedule quietly.
        void queryClient.invalidateQueries({
          queryKey: schedulePetPrefixKey(petId),
        });
      }
      invalidateHouseholdMaintenanceRollups();
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
