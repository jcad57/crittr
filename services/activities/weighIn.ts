/**
 * Weigh-ins, which unlike other activities span three tables: the timeline row,
 * the `pet_weight_entries` point that backs the weight chart, and the pet's
 * current weight. Kept apart so that coupling stays visible.
 */

import { supabase } from "@/lib/supabase";
import { requestRemoteCoCarerActivityPush } from "@/services/coCarerActivityPush";
import { trackActivityLogged } from "@/lib/analytics";
import { parseWeighInWeight } from "@/utils/weighInWeight";
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
  const value = parseWeighInWeight(raw);
  if (value === null) {
    throw new Error("Enter a valid weight greater than 0.");
  }
  return value;
}

/** ISO `date` (YYYY-MM-DD) for `pet_weight_entries.recorded_at`, in local calendar. */
function localDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export class DuplicateWeighInError extends Error {
  constructor(public readonly recordedAt: string) {
    super("A weigh-in already exists for this date.");
    this.name = "DuplicateWeighInError";
  }
}

async function saveWeighIn(
  petId: string,
  form: WeighInActivityFormData,
  loggedAt: string,
  replaceExisting = false,
  activityId?: string,
): Promise<PetActivity> {
  const recordedAt = localDateOnly(new Date(loggedAt));
  if (!Number.isFinite(Date.parse(loggedAt))) throw new Error("Choose a valid weigh-in date.");
  const { data, error } = await supabase.rpc("save_pet_weigh_in", {
    p_pet_id: petId,
    p_recorded_at: recordedAt,
    p_logged_at: loggedAt,
    p_weight: parseWeightOrThrow(form.weight),
    p_unit: form.weightUnit === "kg" ? "kg" : "lbs",
    p_label: form.label.trim() || WEIGH_IN_DEFAULT_LABEL,
    p_notes: form.notes.trim() || null,
    p_replace_existing: replaceExisting,
    p_activity_id: activityId ?? null,
  }).single();
  if (error?.code === "P2001") throw new DuplicateWeighInError(recordedAt);
  if (error) throw error;
  return data as PetActivity;
}

/** Save chart, timeline, and latest pet weight atomically; duplicates require consent. */
export async function logWeighIn(
  petId: string,
  userId: string,
  form: WeighInActivityFormData,
  options?: LogActivityOptions & { replaceExisting?: boolean },
): Promise<PetActivity> {
  const data = await saveWeighIn(petId, form,
    options?.loggedAt ?? new Date().toISOString(), options?.replaceExisting);
  requestRemoteCoCarerActivityPush(data.id);
  trackActivityLogged("weigh_in");
  return data;
}

export async function updateWeighInActivity(
  activityId: string,
  form: WeighInActivityFormData,
  options?: { loggedAt?: string; replaceExisting?: boolean },
): Promise<PetActivity> {
  const { data: existing, error } = await supabase.from("pet_activities")
    .select("pet_id, logged_at").eq("id", activityId).single();
  if (error) throw error;
  return saveWeighIn(existing.pet_id, form, options?.loggedAt ?? existing.logged_at,
    options?.replaceExisting, activityId);
}
