import type { PetScheduleItem } from "@/types/database";

/** The card celebrates actual scheduled tasks, independently of daily goal counts. */
export function isScheduleDayComplete(
  items: PetScheduleItem[] | undefined,
  petId: string | null,
  localYmd: string,
): boolean {
  if (!petId || !items?.length) return false;
  return items.every(
    (item) =>
      item.pet_id === petId &&
      item.local_date === localYmd &&
      Boolean(item.completed_at),
  );
}
