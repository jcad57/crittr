import type { ActivityType } from "@/types/database";

export type SchedulePeriod = "morning" | "afternoon" | "evening";

/** Morning: 00:00–11:59, Afternoon: 12:00–16:59, Evening: 17:00–23:59 (local). */
export function periodForHourMinute(
  hour: number,
  minute: number = 0,
): SchedulePeriod {
  const mins = hour * 60 + minute;
  if (mins < 12 * 60) return "morning";
  if (mins < 17 * 60) return "afternoon";
  return "evening";
}

/** Parse Postgres `time` / `HH:MM` / `HH:MM:SS` into hour+minute. */
export function parseScheduleTime(t: string): { hour: number; minute: number } {
  const parts = t.trim().split(":");
  const h = parseInt(parts[0] ?? "0", 10);
  const m = parseInt(parts[1] ?? "0", 10);
  return {
    hour: Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : 0,
    minute: Number.isFinite(m) ? Math.min(59, Math.max(0, m)) : 0,
  };
}

export function periodForScheduledTime(t: string): SchedulePeriod {
  const { hour, minute } = parseScheduleTime(t);
  return periodForHourMinute(hour, minute);
}

export function toPgTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

export function scheduledTimeToMinutes(t: string): number {
  const { hour, minute } = parseScheduleTime(t);
  return hour * 60 + minute;
}

export const SCHEDULE_PERIOD_ORDER: SchedulePeriod[] = [
  "morning",
  "afternoon",
  "evening",
];

export const SCHEDULE_PERIOD_LABELS: Record<SchedulePeriod, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

/** Map activity_type (+ treat flag) to activity history display category keys. */
export function scheduleDisplayCategory(
  activityType: ActivityType,
  isTreat?: boolean,
):
  | "exercise"
  | "meals"
  | "treats"
  | "meds"
  | "vet_visit"
  | "training"
  | "potty"
  | "maintenance"
  | "weigh_in" {
  if (activityType === "food") return isTreat ? "treats" : "meals";
  if (activityType === "medication") return "meds";
  return activityType;
}
