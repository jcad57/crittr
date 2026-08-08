/**
 * Ticking a schedule item off, and unticking it.
 *
 * Completing mirrors the item into a real logged activity, so most of this is
 * reconstituting an activity form from the slot metadata the plan snapshotted.
 */

import { supabase } from "@/lib/supabase";
import {
  deletePetActivity,
  logExercise,
  logFood,
  logMedication,
} from "@/services/activities";
import type {
  ExerciseFormData,
  FoodActivityFormData,
  MedicationActivityFormData,
  PetScheduleItem,
  ScheduleSourceKind,
} from "@/types/database";
import { FOOD_ACTIVITY_OTHER_ID } from "@/types/database";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function metaString(meta: Record<string, unknown>, key: string): string {
  const v = meta[key];
  return typeof v === "string" ? v : v != null ? String(v) : "";
}

function metaBool(meta: Record<string, unknown>, key: string): boolean {
  return meta[key] === true;
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

function parseAmount(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const n = parseFloat(t);
  return Number.isFinite(n) ? String(n) : "";
}

async function createActivityForScheduleItem(
  item: PetScheduleItem,
  userId: string,
  loggedAt: string,
): Promise<string | null> {
  const meta = (item.meta ?? {}) as Record<string, unknown>;

  if (item.activity_type === "food") {
    const foodIdRaw = metaString(meta, "food_id");
    const hasFoodId = foodIdRaw.length > 0 && isUuid(foodIdRaw);
    let amount = parseAmount(metaString(meta, "portion_size"));
    let unit = metaString(meta, "portion_unit");
    if (!amount && item.quantity_line) {
      const parts = item.quantity_line.trim().split(/\s+/);
      if (parts[0] && /^\d/.test(parts[0]!)) {
        amount = parseAmount(parts[0]!);
        unit = parts.slice(1).join(" ") || unit;
      }
    }
    const form: FoodActivityFormData = {
      label: item.label,
      isTreat:
        metaBool(meta, "is_treat") || item.source_kind === "food_treat",
      foodId: hasFoodId ? foodIdRaw : FOOD_ACTIVITY_OTHER_ID,
      foodBrand: item.detail_line?.trim() || item.label,
      amount,
      unit,
      notes: item.notes ?? "",
    };
    const act = await logFood(item.pet_id, userId, form, { loggedAt });
    return act.id;
  }

  if (item.activity_type === "medication") {
    const medIdRaw =
      metaString(meta, "medication_id") ||
      (isUuid(item.source_id) ? item.source_id : "");
    const form: MedicationActivityFormData = {
      medicationId: medIdRaw,
      medicationName: item.label,
      amount: parseAmount(metaString(meta, "amount")),
      unit: metaString(meta, "unit"),
      notes: item.notes ?? "",
    };
    const act = await logMedication(item.pet_id, userId, form, { loggedAt });
    return act.id;
  }

  if (item.activity_type === "exercise") {
    const mins = meta.duration_minutes;
    const form: ExerciseFormData = {
      label: item.label,
      exerciseType: metaString(meta, "exercise_type") || item.label || "Walk",
      customExerciseType: "",
      durationHours: "",
      durationMinutes:
        typeof mins === "number" && mins > 0 ? String(mins) : "",
      distanceMiles: "",
      location: item.detail_line ?? "Home",
      notes: item.notes ?? "",
    };
    const act = await logExercise(item.pet_id, userId, form, { loggedAt });
    return act.id;
  }

  if (item.activity_type === "vet_visit") {
    return null;
  }

  return null;
}

/**
 * Mark a schedule item complete: stamp completion, then link a pet_activity.
 */
export async function completeScheduleItem(
  itemId: string,
  userId: string,
): Promise<PetScheduleItem> {
  const { data: row, error: fetchErr } = await supabase
    .from("pet_schedule_items")
    .select("*")
    .eq("id", itemId)
    .single();
  if (fetchErr) throw fetchErr;
  const item = row as PetScheduleItem;

  if (item.completed_at) {
    return item;
  }

  const loggedAt = new Date().toISOString();

  // Persist completion first so plan-sync races cannot wipe an in-flight toggle.
  const { data: stamped, error: stampErr } = await supabase
    .from("pet_schedule_items")
    .update({
      completed_at: loggedAt,
      updated_at: loggedAt,
    })
    .eq("id", itemId)
    .is("completed_at", null)
    .select("*")
    .maybeSingle();

  if (stampErr) throw stampErr;

  if (!stamped) {
    const { data: again, error: againErr } = await supabase
      .from("pet_schedule_items")
      .select("*")
      .eq("id", itemId)
      .single();
    if (againErr) throw againErr;
    return again as PetScheduleItem;
  }

  const stampedItem = stamped as PetScheduleItem;

  try {
    const activityId = await createActivityForScheduleItem(
      stampedItem,
      userId,
      loggedAt,
    );

    if (activityId === stampedItem.activity_id) {
      return stampedItem;
    }

    const { data: linked, error: linkErr } = await supabase
      .from("pet_schedule_items")
      .update({
        activity_id: activityId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", itemId)
      .select("*")
      .single();

    if (linkErr) throw linkErr;
    return linked as PetScheduleItem;
  } catch (e) {
    // Keep the schedule item completed even if activity logging fails —
    // rolling back would make the toggle flicker. Activity can be linked later.
    if (__DEV__) {
      console.warn("[schedule] activity log after complete failed", e);
    }
    return stampedItem;
  }
}

/**
 * Un-complete a schedule item and delete the linked activity (when we created it).
 */
export async function uncompleteScheduleItem(
  itemId: string,
): Promise<PetScheduleItem> {
  const { data: row, error: fetchErr } = await supabase
    .from("pet_schedule_items")
    .select("*")
    .eq("id", itemId)
    .single();
  if (fetchErr) throw fetchErr;
  const item = row as PetScheduleItem;

  const activityId = item.activity_id;
  const kind = item.source_kind as ScheduleSourceKind;

  const { data: updated, error } = await supabase
    .from("pet_schedule_items")
    .update({
      completed_at: null,
      activity_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .select("*")
    .single();
  if (error) throw error;

  if (activityId && kind !== "vet_visit") {
    try {
      await deletePetActivity(activityId);
    } catch (e) {
      if (__DEV__) console.warn("[schedule] delete activity on uncomplete", e);
    }
  }

  return updated as PetScheduleItem;
}
