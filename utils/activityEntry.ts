import type { ActivityType, PetScheduleItem } from "@/types/database";

const PICKER_TYPES = new Set<ActivityType>([
  "exercise",
  "food",
  "medication",
  "training",
  "potty",
  "maintenance",
  "weigh_in",
]);
const SCHEDULE_MATCH_TYPES = new Set<ActivityType>([
  "exercise",
  "food",
  "medication",
  "potty",
]);

export function activityTypeFromParam(
  raw: string | string[] | undefined,
): ActivityType | null {
  const type = Array.isArray(raw) ? raw[0] : raw;
  return type && PICKER_TYPES.has(type as ActivityType)
    ? (type as ActivityType)
    : null;
}

export function canMatchSchedule(type: ActivityType | null): boolean {
  return type != null && SCHEDULE_MATCH_TYPES.has(type);
}

/** Shared by the original picker and sheet entry, preserving the schedule prompt. */
export function pendingScheduleMatches(
  type: ActivityType,
  items: PetScheduleItem[] | undefined,
): PetScheduleItem[] {
  return canMatchSchedule(type)
    ? (items ?? []).filter(
        (item) => !item.completed_at && item.activity_type === type,
      )
    : [];
}
