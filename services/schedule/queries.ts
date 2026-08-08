/** Reads of the stored schedule rows for a pet’s day. */

import { supabase } from "@/lib/supabase";
import type { PetScheduleItem } from "@/types/database";

export async function fetchScheduleItemsForDay(
  petId: string,
  localYmd: string,
): Promise<PetScheduleItem[]> {
  const { data, error } = await supabase
    .from("pet_schedule_items")
    .select("*")
    .eq("pet_id", petId)
    .eq("local_date", localYmd)
    .order("scheduled_time", { ascending: true });

  if (error) throw error;
  return (data ?? []) as PetScheduleItem[];
}
