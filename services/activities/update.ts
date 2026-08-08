/**
 * Edits to an activity that already exists: field updates and deletion.
 *
 * Unlike creation these do not notify co-carers — the original log already did,
 * and a correction is not a new event worth waking someone for.
 */

import { supabase } from "@/lib/supabase";
import {
  FOOD_ACTIVITY_OTHER_ID,
  type ExerciseFormData,
  type FoodActivityFormData,
  type MaintenanceActivityFormData,
  type MedicationActivityFormData,
  type PetActivity,
  type PottyActivityFormData,
  type TrainingActivityFormData,
  type VetVisitActivityFormData,
} from "@/types/database";

export async function deletePetActivity(activityId: string): Promise<void> {
  const { error } = await supabase
    .from("pet_activities")
    .delete()
    .eq("id", activityId);

  if (error) throw error;
}

export async function updateExerciseActivity(
  activityId: string,
  form: ExerciseFormData,
): Promise<PetActivity> {
  const exType =
    form.exerciseType === "Other"
      ? form.customExerciseType.trim()
      : form.exerciseType;

  const { data, error } = await supabase
    .from("pet_activities")
    .update({
      label: form.label.trim(),
      exercise_type: exType || null,
      duration_hours: form.durationHours
        ? parseInt(form.durationHours, 10)
        : null,
      duration_minutes: form.durationMinutes
        ? parseInt(form.durationMinutes, 10)
        : null,
      distance_miles: form.distanceMiles
        ? parseFloat(form.distanceMiles)
        : null,
      location: form.location.trim() || null,
      notes: form.notes.trim() || null,
    })
    .eq("id", activityId)
    .select()
    .single();

  if (error) throw error;
  return data as PetActivity;
}

export async function updateFoodActivity(
  activityId: string,
  form: FoodActivityFormData,
): Promise<PetActivity> {
  const isOther = form.foodId === FOOD_ACTIVITY_OTHER_ID;
  const { data, error } = await supabase
    .from("pet_activities")
    .update({
      label: form.label.trim(),
      is_treat: form.isTreat,
      food_id: isOther ? null : form.foodId || null,
      food_custom_name: isOther ? form.foodBrand.trim() || null : null,
      food_amount: form.amount ? parseFloat(form.amount) : null,
      food_unit: form.unit || null,
      notes: form.notes.trim() || null,
    })
    .eq("id", activityId)
    .select()
    .single();

  if (error) throw error;
  return data as PetActivity;
}

export async function updateMedicationActivity(
  activityId: string,
  form: MedicationActivityFormData,
): Promise<PetActivity> {
  const { data, error } = await supabase
    .from("pet_activities")
    .update({
      label: form.medicationName.trim(),
      medication_id: form.medicationId || null,
      med_amount: form.amount ? parseFloat(form.amount) : null,
      med_unit: form.unit || null,
      notes: form.notes.trim() || null,
    })
    .eq("id", activityId)
    .select()
    .single();

  if (error) throw error;
  return data as PetActivity;
}

export async function updateVetVisitActivity(
  activityId: string,
  form: VetVisitActivityFormData,
): Promise<PetActivity> {
  const location =
    form.vetLocation === "Other"
      ? form.customVetLocation.trim()
      : form.vetLocation;

  const { data, error } = await supabase
    .from("pet_activities")
    .update({
      label: form.label.trim(),
      vet_location: location || null,
      other_pet_ids: form.otherPetIds.length > 0 ? form.otherPetIds : null,
      notes: form.notes.trim() || null,
    })
    .eq("id", activityId)
    .select()
    .single();

  if (error) throw error;
  return data as PetActivity;
}

export async function updatePottyActivity(
  activityId: string,
  form: PottyActivityFormData,
  options?: { loggedAt?: string },
): Promise<PetActivity> {
  if (!form.pee && !form.poo) {
    throw new Error("Select pee and/or poo.");
  }

  const { data, error } = await supabase
    .from("pet_activities")
    .update({
      label: "Potty",
      potty_pee: form.pee,
      potty_poo: form.poo,
      location: form.location.trim() || null,
      notes: form.notes.trim() || null,
      ...(options?.loggedAt ? { logged_at: options.loggedAt } : {}),
    })
    .eq("id", activityId)
    .select()
    .single();

  if (error) throw error;
  return data as PetActivity;
}

export async function updateMaintenanceActivity(
  activityId: string,
  form: MaintenanceActivityFormData,
  options?: { loggedAt?: string },
): Promise<PetActivity> {
  const label = form.label.trim() || "Litter box cleaning";
  const { data, error } = await supabase
    .from("pet_activities")
    .update({
      label,
      location: null,
      notes: form.notes.trim() || null,
      ...(options?.loggedAt ? { logged_at: options.loggedAt } : {}),
    })
    .eq("id", activityId)
    .select()
    .single();

  if (error) throw error;
  return data as PetActivity;
}

export async function updateTrainingActivity(
  activityId: string,
  form: TrainingActivityFormData,
  options?: { loggedAt?: string },
): Promise<PetActivity> {
  const mins = form.durationMinutes.trim()
    ? parseInt(form.durationMinutes.trim(), 10)
    : NaN;
  if (!Number.isFinite(mins) || mins < 1) {
    throw new Error("Enter a valid duration in minutes.");
  }
  const loc = form.location.trim();
  if (!loc) {
    throw new Error("Location is required.");
  }

  const { data, error } = await supabase
    .from("pet_activities")
    .update({
      label: form.label.trim() || "Training",
      duration_hours: null,
      duration_minutes: mins,
      location: loc,
      notes: form.notes.trim() || null,
      ...(options?.loggedAt ? { logged_at: options.loggedAt } : {}),
    })
    .eq("id", activityId)
    .select()
    .single();

  if (error) throw error;
  return data as PetActivity;
}

