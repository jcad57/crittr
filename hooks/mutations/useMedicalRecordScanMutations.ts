import {
  healthSnapshotKey,
  petDetailsQueryKey,
} from "@/hooks/queries/queryKeys";
import { queryClient } from "@/lib/queryClient";
import {
  parseMedicalRecord,
  type ExtractedMedication,
  type ExtractedVaccination,
  type ParseMedicalRecordResult,
} from "@/services/medicalRecordParser";
import {
  insertPetMedication,
  updatePetMedication,
  type UpdatePetMedicationInput,
} from "@/services/medications";
import {
  createPetVaccination,
  updatePetVaccination,
  type CreatePetVaccinationInput,
  type UpdatePetVaccinationInput,
} from "@/services/health";
import { useAuthStore } from "@/stores/authStore";
import { useMutation } from "@tanstack/react-query";

export function useParseMedicalRecordMutation() {
  return useMutation<
    ParseMedicalRecordResult,
    Error,
    { petId: string; medicalRecordId: string; fileIds?: string[] }
  >({
    mutationFn: (input) => parseMedicalRecord(input),
  });
}

/**
 * Mode the user picked for a scanned candidate in the review sheet.
 * - skip: don't write anything
 * - insert: create a new row
 * - update: merge into an existing row (`duplicate_of_id`); null-ish fields preserved
 */
export type ScanMedicationDecision = {
  mode: "skip" | "insert" | "update";
  existingId: string | null;
  extracted: ExtractedMedication;
};

export type ScanVaccinationDecision = {
  mode: "skip" | "insert" | "update";
  existingId: string | null;
  extracted: ExtractedVaccination;
};

function toMedicationInput(e: ExtractedMedication): UpdatePetMedicationInput {
  return {
    name: e.name,
    dosage: e.dosage,
    frequency: e.frequency,
    condition: e.condition,
    notes: e.notes,
    doses_per_period: e.doses_per_period,
    dose_period: e.dose_period,
    reminder_time: null,
    interval_count: e.interval_count,
    interval_unit: e.interval_unit,
    last_given_on: e.last_given_on,
    next_due_date: e.next_due_date,
  };
}

function toCreateVaccinationInput(
  petId: string,
  e: ExtractedVaccination,
): CreatePetVaccinationInput {
  return {
    pet_id: petId,
    name: e.name,
    expires_on: e.expires_on,
    frequency_label: e.frequency_label,
    notes: e.notes,
    administered_on: e.administered_on,
    administered_by: e.administered_by,
    lot_number: e.lot_number,
    next_due_date: e.next_due_date,
  };
}

function toUpdateVaccinationInput(
  e: ExtractedVaccination,
): UpdatePetVaccinationInput {
  return {
    name: e.name,
    expires_on: e.expires_on,
    frequency_label: e.frequency_label,
    notes: e.notes,
    administered_on: e.administered_on,
    administered_by: e.administered_by,
    lot_number: e.lot_number,
    next_due_date: e.next_due_date,
  };
}

/**
 * Applies the user's confirmed review to the database. Runs inserts/updates sequentially so
 * one failure (RLS, network) stops the batch and surfaces a clear error; partial successes
 * are preserved (rows already written stay written). The query cache is invalidated once at
 * the end so the review sheet's close animation isn't blocked by refetches.
 */
export function useApplyMedicalRecordScanMutation(petId: string) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation<
    { medsApplied: number; vacsApplied: number },
    Error,
    {
      medications: ScanMedicationDecision[];
      vaccinations: ScanVaccinationDecision[];
    }
  >({
    mutationFn: async ({ medications, vaccinations }) => {
      let medsApplied = 0;
      let vacsApplied = 0;

      /** RLS denies (code 42501) read very differently from generic errors; we rewrite them
       *  to a user-readable sentence so co-carers without the right permission don't see
       *  "new row violates row-level security policy". */
      const wrapRlsError = (label: string, e: unknown): never => {
        const msg = e instanceof Error ? e.message : String(e);
        if (/row-level security|42501|permission/i.test(msg)) {
          throw new Error(
            `You don't have permission to save ${label} for this pet. Ask the owner to enable that permission.`,
          );
        }
        throw e;
      };

      for (const d of medications) {
        if (d.mode === "skip") continue;
        try {
          const input = toMedicationInput(d.extracted);
          if (d.mode === "update" && d.existingId) {
            await updatePetMedication(petId, d.existingId, input);
          } else {
            await insertPetMedication(petId, input);
          }
        } catch (e) {
          wrapRlsError("medications", e);
        }
        medsApplied += 1;
      }

      for (const d of vaccinations) {
        if (d.mode === "skip") continue;
        try {
          if (d.mode === "update" && d.existingId) {
            await updatePetVaccination(
              petId,
              d.existingId,
              toUpdateVaccinationInput(d.extracted),
            );
          } else {
            await createPetVaccination(
              toCreateVaccinationInput(petId, d.extracted),
            );
          }
        } catch (e) {
          wrapRlsError("vaccinations", e);
        }
        vacsApplied += 1;
      }

      return { medsApplied, vacsApplied };
    },
    onSuccess: () => {
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
