import { supabase } from "@/lib/supabase";
import {
  FOOD_ACTIVITY_OTHER_ID,
  type ExerciseFormData,
  type FoodActivityFormData,
  type MedicationActivityFormData,
  type PetActivity,
  type VetVisitActivityFormData,
} from "@/types/database";

export async function fetchActivityById(
  activityId: string,
): Promise<PetActivity | null> {
  const { data, error } = await supabase
    .from("pet_activities")
    .select("*")
    .eq("id", activityId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as PetActivity | null;
}

export async function deletePetActivity(activityId: string): Promise<void> {
  const { error } = await supabase
    .from("pet_activities")
    .delete()
    .eq("id", activityId);

  if (error) throw error;
}

export async function fetchTodayActivities(
  petId: string,
): Promise<PetActivity[]> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("pet_activities")
    .select("*")
    .eq("pet_id", petId)
    .gte("logged_at", startOfDay.toISOString())
    .order("logged_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PetActivity[];
}

/** Today's activities for any of the given pets (e.g. Health hub multi-pet). */
export async function fetchTodayActivitiesForPetIds(
  petIds: string[],
): Promise<PetActivity[]> {
  if (petIds.length === 0) return [];

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("pet_activities")
    .select("*")
    .in("pet_id", petIds)
    .gte("logged_at", startOfDay.toISOString())
    .order("logged_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PetActivity[];
}

export async function fetchActivitiesForPet(
  petId: string,
): Promise<PetActivity[]> {
  const { data, error } = await supabase
    .from("pet_activities")
    .select("*")
    .eq("pet_id", petId)
    .order("logged_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PetActivity[];
}

export async function logExercise(
  petId: string,
  userId: string,
  form: ExerciseFormData,
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
    })
    .select()
    .single();

  if (error) throw error;
  return data as PetActivity;
}

export async function logFood(
  petId: string,
  userId: string,
  form: FoodActivityFormData,
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
    })
    .select()
    .single();

  if (error) throw error;
  return data as PetActivity;
}

export async function logMedication(
  petId: string,
  userId: string,
  form: MedicationActivityFormData,
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
    })
    .select()
    .single();

  if (error) throw error;
  return data as PetActivity;
}

export async function logVetVisit(
  petId: string,
  userId: string,
  form: VetVisitActivityFormData,
  allPetIds: string[],
): Promise<PetActivity[]> {
  const location =
    form.vetLocation === "Other"
      ? form.customVetLocation.trim()
      : form.vetLocation;

  const targetPetIds = [petId, ...form.otherPetIds];
  const results: PetActivity[] = [];

  for (const pid of targetPetIds) {
    const { data, error } = await supabase
      .from("pet_activities")
      .insert({
        pet_id: pid,
        logged_by: userId,
        activity_type: "vet_visit",
        label: form.label.trim(),
        vet_location: location || null,
        other_pet_ids: form.otherPetIds.length > 0 ? form.otherPetIds : null,
        notes: form.notes.trim() || null,
      })
      .select()
      .single();

    if (error) throw error;
    results.push(data as PetActivity);
  }

  return results;
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
