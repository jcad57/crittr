/**
 * Pushing edits made to an activity back onto the schedule rows that mirror it,
 * so a renamed or re-dosed activity does not leave a stale label on the day.
 */

import { supabase } from "@/lib/supabase";
import type { PetActivity, PetScheduleItem } from "@/types/database";
import {
  scheduleDisplayFieldsFromActivity,
  withFoodBrand,
} from "@/utils/scheduleDisplayFromActivity";

/**
 * Refresh snapshotted display fields on every schedule row linked to an activity.
 */
export async function syncScheduleItemsLinkedToActivity(
  activity: PetActivity,
  options?: { foodBrand?: string | null },
): Promise<PetScheduleItem[]> {
  let fields = scheduleDisplayFieldsFromActivity(activity);
  if (activity.activity_type === "food") {
    fields = withFoodBrand(fields, options?.foodBrand);
  }

  const updatePayload: Record<string, unknown> = {
    label: fields.label,
    quantity_line: fields.quantity_line,
    notes: fields.notes,
    updated_at: new Date().toISOString(),
  };
  if (
    fields.detail_line != null ||
    activity.activity_type !== "food" ||
    options?.foodBrand?.trim()
  ) {
    updatePayload.detail_line = fields.detail_line;
  }

  const { data, error } = await supabase
    .from("pet_schedule_items")
    .update(updatePayload)
    .eq("activity_id", activity.id)
    .select("*");

  if (error) throw error;
  return (data ?? []) as PetScheduleItem[];
}

/**
 * @deprecated Prefer {@link syncScheduleItemsLinkedToActivity}.
 */
export async function syncScheduleItemFromActivity(
  scheduleItemId: string,
  fields: {
    label?: string;
    detail_line?: string | null;
    quantity_line?: string | null;
    notes?: string | null;
  },
): Promise<PetScheduleItem> {
  const { data, error } = await supabase
    .from("pet_schedule_items")
    .update({
      ...fields,
      updated_at: new Date().toISOString(),
    })
    .eq("id", scheduleItemId)
    .select("*")
    .single();
  if (error) throw error;
  return data as PetScheduleItem;
}
