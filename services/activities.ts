import { requestRemoteCoCarerActivityPush } from "@/services/coCarerActivityPush";
import { supabase } from "@/lib/supabase";
import { fetchAccessiblePets } from "@/services/pets";
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
  type WeighInActivityFormData,
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

export async function fetchActivitiesSince(
  petId: string,
  sinceIso: string,
): Promise<PetActivity[]> {
  const { data, error } = await supabase
    .from("pet_activities")
    .select("*")
    .eq("pet_id", petId)
    .gte("logged_at", sinceIso)
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

export type LogActivityOptions = {
  /** ISO timestamp for `logged_at` (defaults to DB `now()` if omitted). */
  loggedAt?: string;
};

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

/**
 * For each accessible pet, if a vet visit is scheduled for **local calendar today**
 * and no mirror row exists yet (`vet_visit_id`), inserts `pet_activities`.
 * Call on app bootstrap, day rollover, and foreground — not when the visit is first created.
 */
export async function ensureTodayVetVisitMirrorActivities(
  userId: string,
): Promise<{ petIds: string[] }> {
  const petsWithRole = await fetchAccessiblePets(userId);
  const pets = petsWithRole.filter((p) => !p.is_memorialized);
  if (pets.length === 0) return { petIds: [] };

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const todayStartMs = start.getTime();

  for (const pet of pets) {
    const { data: mirrors } = await supabase
      .from("pet_activities")
      .select("id,vet_visit_id")
      .eq("pet_id", pet.id)
      .not("vet_visit_id", "is", null);

    for (const m of mirrors ?? []) {
      const vid = m.vet_visit_id;
      if (!vid) continue;
      const { data: vrow } = await supabase
        .from("pet_vet_visits")
        .select("visit_at")
        .eq("id", vid)
        .maybeSingle();
      if (!vrow) {
        await supabase.from("pet_activities").delete().eq("id", m.id);
        continue;
      }
      const visitDay = new Date(vrow.visit_at);
      visitDay.setHours(0, 0, 0, 0);
      if (visitDay.getTime() > todayStartMs) {
        await supabase.from("pet_activities").delete().eq("id", m.id);
      }
    }

    const { data: visits, error: vErr } = await supabase
      .from("pet_vet_visits")
      .select("id,pet_id,title,visit_at,location,notes")
      .eq("pet_id", pet.id)
      .gte("visit_at", start.toISOString())
      .lte("visit_at", end.toISOString());

    if (vErr) {
      if (__DEV__) console.warn("[ensureTodayVetVisitMirrorActivities]", vErr);
      continue;
    }

    for (const v of visits ?? []) {
      const { data: existing } = await supabase
        .from("pet_activities")
        .select("id")
        .eq("vet_visit_id", v.id)
        .maybeSingle();

      if (existing) continue;

      const { error: insErr } = await supabase.from("pet_activities").insert({
        pet_id: v.pet_id,
        logged_by: userId,
        activity_type: "vet_visit",
        label: v.title,
        logged_at: v.visit_at,
        vet_location: v.location,
        notes: v.notes,
        vet_visit_id: v.id,
      });

      if (insErr && __DEV__) {
        console.warn("[ensureTodayVetVisitMirrorActivities] insert", insErr);
      }
    }
  }

  return { petIds: pets.map((p) => p.id) };
}

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

// ─── Weigh-in ────────────────────────────────────────────────────────────────

/** Default activity label when the user leaves the field empty. */
const WEIGH_IN_DEFAULT_LABEL = "Weigh-in";

/**
 * Parse a comma- or dot-decimal weight string into a positive finite number.
 * Throws with a user-facing message when the input cannot be saved.
 */
function parseWeightOrThrow(raw: string): number {
  const cleaned = raw.replace(",", ".").trim();
  const value = parseFloat(cleaned);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Enter a valid weight greater than 0.");
  }
  return Math.round(value * 100) / 100;
}

/** ISO `date` (YYYY-MM-DD) for `pet_weight_entries.recorded_at`, in local calendar. */
function localDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Insert a `pet_weight_entries` row + a mirrored `pet_activities` row in one go.
 * Also updates the pet's current weight on `pets`. Returns the activity row so
 * the caller can navigate / refresh exactly like other log* helpers.
 */
export async function logWeighIn(
  petId: string,
  userId: string,
  form: WeighInActivityFormData,
  options?: LogActivityOptions,
): Promise<PetActivity> {
  const weight = parseWeightOrThrow(form.weight);
  const unit: "lbs" | "kg" = form.weightUnit === "kg" ? "kg" : "lbs";
  const loggedAtIso = options?.loggedAt ?? new Date().toISOString();
  const recordedAt = localDateOnly(new Date(loggedAtIso));

  const { data: entry, error: entryErr } = await supabase
    .from("pet_weight_entries")
    .insert({
      pet_id: petId,
      recorded_at: recordedAt,
      weight_lbs: weight,
      weight_unit: unit,
    })
    .select()
    .single();

  if (entryErr) throw entryErr;

  const { data, error } = await supabase
    .from("pet_activities")
    .insert({
      pet_id: petId,
      logged_by: userId,
      activity_type: "weigh_in",
      label: form.label.trim() || WEIGH_IN_DEFAULT_LABEL,
      weight_lbs: weight,
      weight_unit: unit,
      weight_entry_id: entry.id,
      notes: form.notes.trim() || null,
      logged_at: loggedAtIso,
    })
    .select()
    .single();

  if (error) {
    /** Roll back the entry so the chart doesn't show an orphaned point. */
    await supabase.from("pet_weight_entries").delete().eq("id", entry.id);
    throw error;
  }

  await supabase
    .from("pets")
    .update({ weight_lbs: weight, weight_unit: unit })
    .eq("id", petId);

  requestRemoteCoCarerActivityPush(data.id);
  return data as PetActivity;
}

/**
 * Update an existing weigh-in activity (and its linked weight entry). When the
 * weight or unit changes we also bring the pet's current weight in line if this
 * is the most recent reading.
 */
export async function updateWeighInActivity(
  activityId: string,
  form: WeighInActivityFormData,
  options?: { loggedAt?: string },
): Promise<PetActivity> {
  const weight = parseWeightOrThrow(form.weight);
  const unit: "lbs" | "kg" = form.weightUnit === "kg" ? "kg" : "lbs";

  const { data: existing, error: existingErr } = await supabase
    .from("pet_activities")
    .select("id, pet_id, weight_entry_id, logged_at")
    .eq("id", activityId)
    .single();

  if (existingErr) throw existingErr;

  const loggedAtIso = options?.loggedAt ?? existing.logged_at;
  const recordedAt = localDateOnly(new Date(loggedAtIso));

  const { data, error } = await supabase
    .from("pet_activities")
    .update({
      label: form.label.trim() || WEIGH_IN_DEFAULT_LABEL,
      weight_lbs: weight,
      weight_unit: unit,
      notes: form.notes.trim() || null,
      logged_at: loggedAtIso,
    })
    .eq("id", activityId)
    .select()
    .single();

  if (error) throw error;

  if (existing.weight_entry_id) {
    await supabase
      .from("pet_weight_entries")
      .update({
        recorded_at: recordedAt,
        weight_lbs: weight,
        weight_unit: unit,
      })
      .eq("id", existing.weight_entry_id);
  }

  /** Sync the pet's current weight if this is still the latest reading. */
  if (existing.pet_id) {
    const { data: latest } = await supabase
      .from("pet_weight_entries")
      .select("id, weight_lbs, weight_unit")
      .eq("pet_id", existing.pet_id)
      .order("recorded_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest && latest.id === existing.weight_entry_id) {
      await supabase
        .from("pets")
        .update({
          weight_lbs: latest.weight_lbs,
          weight_unit: latest.weight_unit,
        })
        .eq("id", existing.pet_id);
    }
  }

  return data as PetActivity;
}
