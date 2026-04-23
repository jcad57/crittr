import { healthSnapshotKey, petDetailsQueryKey } from "@/hooks/queries/queryKeys";
import { queryClient } from "@/lib/queryClient";
import { syncCrittrReminderNotifications } from "@/lib/reminderNotificationSchedule";
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

export function useInsertMedicationMutation(petId: string) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: (input: UpdatePetMedicationInput) =>
      insertPetMedication(petId, input),
    onSuccess: (newMed) => {
      mergeMedicationIntoPetDetailsCache(petId, (meds) => [...meds, newMed]);
      void queryClient.invalidateQueries({ queryKey: petDetailsQueryKey(petId) });
      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: healthSnapshotKey(userId),
        });
        requestReminderResync(userId);
      }
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
    onSuccess: (updated) => {
      mergeMedicationIntoPetDetailsCache(petId, (meds) =>
        meds.map((m) => (m.id === updated.id ? updated : m)),
      );
      void queryClient.invalidateQueries({ queryKey: petDetailsQueryKey(petId) });
      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: healthSnapshotKey(userId),
        });
        requestReminderResync(userId);
      }
    },
  });
}

export function useDeleteMedicationMutation(petId: string) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: async (medicationId: string) =>
      deletePetMedication(petId, medicationId),
    onSuccess: (_, medicationId) => {
      mergeMedicationIntoPetDetailsCache(petId, (meds) =>
        meds.filter((m) => m.id !== medicationId),
      );
      void queryClient.invalidateQueries({ queryKey: petDetailsQueryKey(petId) });
      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: healthSnapshotKey(userId),
        });
        requestReminderResync(userId);
      }
    },
  });
}
