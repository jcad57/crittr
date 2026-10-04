import { healthSnapshotKey, petDetailsQueryKey } from "@/lib/query/keys";
import { requestScheduleResync } from "@/hooks/queries/useScheduleQuery";
import { queryClient } from "@/lib/query/client";
import { syncCrittrReminderNotifications } from "@/services/reminderNotificationSchedule";
import type { OwnerHealthSnapshot } from "@/services/health";
import {
  deletePetMedication,
  insertPetMedication,
  type UpdatePetMedicationInput,
  updatePetMedication,
} from "@/services/medications";
import type { PetMedication, PetWithDetails } from "@/types/database";
import { useAuthStore } from "@/stores/authStore";
import { notificationPrefsFromProfile } from "@/utils/pushNotificationPreferences";
import { useMutation } from "@tanstack/react-query";
import { Platform } from "react-native";

function requestReminderResync(userId: string | undefined) {
  if (Platform.OS === "web" || !userId) return;
  const profile = useAuthStore.getState().profile;
  if (!profile) return;
  void syncCrittrReminderNotifications(
    userId,
    notificationPrefsFromProfile(profile),
  ).catch((e) => {
    if (__DEV__) console.warn("[medications] reminder sync", e);
  });
}

function mergeMedicationIntoPetDetailsCache(
  petId: string,
  updater: (meds: PetMedication[]) => PetMedication[],
) {
  if (!petId) return;
  queryClient.setQueryData<PetWithDetails | null>(
    petDetailsQueryKey(petId),
    (old) => {
      if (!old) return old;
      return { ...old, medications: updater(old.medications) };
    },
  );
}

function mergeMedicationIntoHealthSnapshotCache(
  userId: string | undefined,
  updater: (
    meds: OwnerHealthSnapshot["medications"],
  ) => OwnerHealthSnapshot["medications"],
) {
  if (!userId) return;
  queryClient.setQueryData<OwnerHealthSnapshot>(
    healthSnapshotKey(userId),
    (old) => {
      if (!old) return old;
      return { ...old, medications: updater(old.medications) };
    },
  );
}

function mergeInsertedMedicationIntoHealthSnapshotCache(
  userId: string | undefined,
  newMed: PetMedication,
  petId: string,
) {
  if (!userId) return;
  queryClient.setQueryData<OwnerHealthSnapshot>(
    healthSnapshotKey(userId),
    (old) => {
      if (!old) return old;
      const pet = old.pets.find((p) => p.id === petId);
      if (!pet) return old;
      return {
        ...old,
        medications: [...old.medications, { ...newMed, pet }],
      };
    },
  );
}

export function useInsertMedicationMutation(petId: string) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: (input: UpdatePetMedicationInput) =>
      insertPetMedication(petId, input),
    onSuccess: async (newMed) => {
      mergeMedicationIntoPetDetailsCache(petId, (meds) => [...meds, newMed]);
      mergeInsertedMedicationIntoHealthSnapshotCache(userId, newMed, petId);
      await queryClient.invalidateQueries({
        queryKey: petDetailsQueryKey(petId),
      });
      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: healthSnapshotKey(userId),
        });
        requestReminderResync(userId);
      }
      requestScheduleResync(petId);
    },
  });
}

export function useUpdateMedicationMutation(petId: string) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: async ({
      medicationId,
      updates,
    }: {
      medicationId: string;
      updates: UpdatePetMedicationInput;
    }) => updatePetMedication(petId, medicationId, updates),
    onSuccess: async (updated) => {
      mergeMedicationIntoPetDetailsCache(petId, (meds) =>
        meds.map((m) => (m.id === updated.id ? updated : m)),
      );
      mergeMedicationIntoHealthSnapshotCache(userId, (meds) =>
        meds.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)),
      );
      await queryClient.invalidateQueries({
        queryKey: petDetailsQueryKey(petId),
      });
      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: healthSnapshotKey(userId),
        });
        requestReminderResync(userId);
      }
      requestScheduleResync(petId);
    },
  });
}

export function useDeleteMedicationMutation(petId: string) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: async (medicationId: string) =>
      deletePetMedication(petId, medicationId),
    onSuccess: async (_, medicationId) => {
      mergeMedicationIntoPetDetailsCache(petId, (meds) =>
        meds.filter((m) => m.id !== medicationId),
      );
      mergeMedicationIntoHealthSnapshotCache(userId, (meds) =>
        meds.filter((m) => m.id !== medicationId),
      );
      await queryClient.invalidateQueries({
        queryKey: petDetailsQueryKey(petId),
      });
      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: healthSnapshotKey(userId),
        });
        requestReminderResync(userId);
      }
      requestScheduleResync(petId);
    },
  });
}
