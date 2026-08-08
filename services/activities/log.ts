/**
 * Creating an activity from a filled-in form, one function per activity type.
 *
 * Each maps its own form shape onto the shared `pet_activities` row and, on
 * success, asks the backend to notify co-carers.
 */

import { supabase } from "@/lib/supabase";
import { requestRemoteCoCarerActivityPush } from "@/services/coCarerActivityPush";
import {
  FOOD_ACTIVITY_OTHER_ID,
  type ExerciseFormData,
  type FoodActivityFormData,
  type MaintenanceActivityFormData,
  type MedicationActivityFormData,
  type PetActivity,
  type PottyActivityFormData,
  type TrainingActivityFormData,
} from "@/types/database";

export type LogActivityOptions = {
  /** ISO timestamp for `logged_at` (defaults to DB `now()` if omitted). */
  loggedAt?: string;
};

export async function logExercise(
  petId: string,
  userId: string,
  form: ExerciseFormData,
  options?: LogActivityOptions,
): Promise<PetActivity> {
  const exType =
    form.exerciseType === "Other"
      ? form.customExerciseType.trim()
      : form.exerciseType;

  const { data, error } = await supabase
    .from("pet_activities")
    .insert({
      pet_id: petId,
      logged_by: userId,
      activity_type: "exercise",
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
      ...(options?.loggedAt ? { logged_at: options.loggedAt } : {}),
    })
    .select()
    .single();

  if (error) throw error;
  requestRemoteCoCarerActivityPush(data.id);
  return data as PetActivity;
}

export async function logFood(
  petId: string,
  userId: string,
  form: FoodActivityFormData,
  options?: LogActivityOptions,
): Promise<PetActivity> {
  const isOther = form.foodId === FOOD_ACTIVITY_OTHER_ID;
  const { data, error } = await supabase
    .from("pet_activities")
    .insert({
      pet_id: petId,
      logged_by: userId,
      activity_type: "food",
      label: form.label.trim(),
      is_treat: form.isTreat,
      food_id: isOther ? null : form.foodId || null,
      food_custom_name: isOther
        ? form.foodBrand.trim() || null
        : null,
      food_amount: form.amount ? parseFloat(form.amount) : null,
      food_unit: form.unit || null,
      notes: form.notes.trim() || null,
      ...(options?.loggedAt ? { logged_at: options.loggedAt } : {}),
    })
    .select()
    .single();

  if (error) throw error;
  requestRemoteCoCarerActivityPush(data.id);
  return data as PetActivity;
}

export async function logMedication(
  petId: string,
  userId: string,
  form: MedicationActivityFormData,
  options?: LogActivityOptions,
): Promise<PetActivity> {
  const { data, error } = await supabase
    .from("pet_activities")
    .insert({
      pet_id: petId,
      logged_by: userId,
      activity_type: "medication",
      label: form.medicationName.trim(),
      medication_id: form.medicationId || null,
      med_amount: form.amount ? parseFloat(form.amount) : null,
      med_unit: form.unit || null,
      notes: form.notes.trim() || null,
      ...(options?.loggedAt ? { logged_at: options.loggedAt } : {}),
    })
    .select()
    .single();

  if (error) throw error;
  requestRemoteCoCarerActivityPush(data.id);
  return data as PetActivity;
}

export async function logPotty(
  petId: string,
  userId: string,
  form: PottyActivityFormData,
  options?: LogActivityOptions,
): Promise<PetActivity> {
  if (!form.pee && !form.poo) {
    throw new Error("Select pee and/or poo.");
  }

  const { data, error } = await supabase
    .from("pet_activities")
    .insert({
      pet_id: petId,
      logged_by: userId,
      activity_type: "potty",
      label: "Potty",
      potty_pee: form.pee,
      potty_poo: form.poo,
      location: form.location.trim() || null,
      notes: form.notes.trim() || null,
      ...(options?.loggedAt ? { logged_at: options.loggedAt } : {}),
    })
    .select()
    .single();

  if (error) throw error;
  requestRemoteCoCarerActivityPush(data.id);
  return data as PetActivity;
}

export async function logMaintenance(
  petId: string,
  userId: string,
  form: MaintenanceActivityFormData,
  options?: LogActivityOptions,
): Promise<PetActivity> {
  const label = form.label.trim() || "Litter box cleaning";
  const { data, error } = await supabase
    .from("pet_activities")
    .insert({
      pet_id: petId,
      logged_by: userId,
      activity_type: "maintenance",
      label,
      location: null,
      notes: form.notes.trim() || null,
      ...(options?.loggedAt ? { logged_at: options.loggedAt } : {}),
    })
    .select()
    .single();

  if (error) throw error;
  requestRemoteCoCarerActivityPush(data.id);
  return data as PetActivity;
}

export async function logTraining(
  petId: string,
  userId: string,
  form: TrainingActivityFormData,
  options?: LogActivityOptions,
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
    .insert({
      pet_id: petId,
      logged_by: userId,
      activity_type: "training",
      label: form.label.trim() || "Training",
      duration_hours: null,
      duration_minutes: mins,
      location: loc,
      notes: form.notes.trim() || null,
      ...(options?.loggedAt ? { logged_at: options.loggedAt } : {}),
    })
    .select()
    .single();

  if (error) throw error;
  requestRemoteCoCarerActivityPush(data.id);
  return data as PetActivity;
}

