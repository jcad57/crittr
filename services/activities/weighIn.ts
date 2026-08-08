/**
 * Weigh-ins, which unlike other activities span three tables: the timeline row,
 * the `pet_weight_entries` point that backs the weight chart, and the pet's
 * current weight. Kept apart so that coupling stays visible.
 */

import { supabase } from "@/lib/supabase";
import { requestRemoteCoCarerActivityPush } from "@/services/coCarerActivityPush";
import type {
  PetActivity,
  WeighInActivityFormData,
} from "@/types/database";
import type { LogActivityOptions } from "./log";

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

