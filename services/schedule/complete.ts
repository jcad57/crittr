/** A task completion and its activity/notification jobs commit in one transaction. */
import { supabase } from "@/lib/supabase";
import { requestRemoteCoCarerActivityPush } from "@/services/coCarerActivityPush";
import type { PetScheduleItem } from "@/types/database";

export async function completeScheduleItem(
  itemId: string,
  _userId: string,
): Promise<PetScheduleItem> {
  const { data, error } = await supabase.rpc("set_pet_schedule_item_completed", {
    p_item_id: itemId, p_completed: true,
  });
  if (error) throw error;
  const item = data as PetScheduleItem | null;
  if (!item) throw new Error("Could not complete this task. Please try again.");
  if (item.activity_id) requestRemoteCoCarerActivityPush(item.activity_id);
  return item;
}

export async function uncompleteScheduleItem(itemId: string): Promise<PetScheduleItem> {
  const { data, error } = await supabase.rpc("set_pet_schedule_item_completed", {
    p_item_id: itemId, p_completed: false,
  });
  if (error) throw error;
  if (!data) throw new Error("Could not undo this task. Please try again.");
  return data as PetScheduleItem;
}
