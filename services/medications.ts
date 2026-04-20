import { supabase } from "@/lib/supabase";
import type { MedicationDosePeriod, PetMedication } from "@/types/database";

export type UpdatePetMedicationInput = {
  name: string;
  dosage: string | null;
  frequency: string | null;
  condition: string | null;
  notes: string | null;
  doses_per_period: number | null;
  dose_period: MedicationDosePeriod | null;
  reminder_time: string | null;
  /** Every N days/weeks/months when using custom interval (null for standard schedule). */
  interval_count: number | null;
  interval_unit: MedicationDosePeriod | null;
  /** ISO date YYYY-MM-DD or null. */
  last_given_on: string | null;
  /** ISO date YYYY-MM-DD or null. Drives health-hub due badges; optional for manual entry, populated by document scanner. */
  next_due_date?: string | null;
};

export async function insertPetMedication(
  petId: string,
  input: UpdatePetMedicationInput,
): Promise<PetMedication> {
  const { data, error } = await supabase
    .from("pet_medications")
    .insert({
      pet_id: petId,
      name: input.name.trim(),
      dosage: input.dosage,
      frequency: input.frequency,
      condition: input.condition,
      notes: input.notes,
      doses_per_period: input.doses_per_period,
      dose_period: input.dose_period,
      reminder_time: input.reminder_time,
      interval_count: input.interval_count,
      interval_unit: input.interval_unit,
      last_given_on: input.last_given_on,
      next_due_date: input.next_due_date ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      typeof error.message === "string" && error.message.length > 0
        ? error.message
        : "Could not add medication",
    );
  }
  return data as PetMedication;
}

export async function updatePetMedication(
  petId: string,
  medicationId: string,
  updates: UpdatePetMedicationInput,
): Promise<PetMedication> {
  const { data, error } = await supabase
    .from("pet_medications")
    .update({
      name: updates.name.trim(),
      dosage: updates.dosage,
      frequency: updates.frequency,
      condition: updates.condition,
      notes: updates.notes,
      doses_per_period: updates.doses_per_period,
      dose_period: updates.dose_period,
      reminder_time: updates.reminder_time,
      interval_count: updates.interval_count,
      interval_unit: updates.interval_unit,
      last_given_on: updates.last_given_on,
      next_due_date: updates.next_due_date ?? null,
    })
    .eq("id", medicationId)
    .eq("pet_id", petId)
    .select()
    .single();

  if (error) {
    throw new Error(
      typeof error.message === "string" && error.message.length > 0
        ? error.message
        : "Could not update medication",
    );
  }
  return data as PetMedication;
}

export async function deletePetMedication(
  petId: string,
  medicationId: string,
): Promise<void> {
  const { error } = await supabase
    .from("pet_medications")
    .delete()
    .eq("id", medicationId)
    .eq("pet_id", petId);

  if (error) {
    throw new Error(
      typeof error.message === "string" && error.message.length > 0
        ? error.message
        : "Could not delete medication",
    );
  }
}
