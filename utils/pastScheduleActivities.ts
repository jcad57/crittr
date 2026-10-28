import type { PetActivity, PetScheduleItem } from "@/types/database";
import { getLocalYmd } from "@/utils/localCalendarDate";

/**
 * A past day may have real activity logs but no materialized schedule. Show
 * those logs without fabricating a historic plan or duplicating linked slots.
 */
export function unlinkedActivitiesForScheduleDay(
  activities: PetActivity[],
  schedule: PetScheduleItem[],
  petId: string | null,
  localYmd: string,
): PetActivity[] {
  const represented = new Set(
    schedule
      .filter((row) => row.pet_id === petId && row.local_date === localYmd)
      .map((row) => row.activity_id)
      .filter((id): id is string => Boolean(id)),
  );
  return activities.filter((activity) => {
    if (activity.pet_id !== petId || represented.has(activity.id)) return false;
    const date = new Date(activity.logged_at);
    if (Number.isNaN(date.getTime()) || getLocalYmd(date) !== localYmd)
      return false;
    represented.add(activity.id);
    return true;
  });
}
