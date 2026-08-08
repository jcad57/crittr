import type { PetExercisePlan } from "@/types/database";
import { getLocalYmd } from "@/utils/localCalendarDate";
import { formatUserTime, type UserTimeDisplay } from "@/utils/userDateTimeFormat";

/** Display order Mon→Sun; values match JS `Date.getDay()` (0=Sun). */
export const EXERCISE_DOW_OPTIONS: ReadonlyArray<{
  value: number;
  short: string;
}> = [
  { value: 1, short: "Mon" },
  { value: 2, short: "Tue" },
  { value: 3, short: "Wed" },
  { value: 4, short: "Thu" },
  { value: 5, short: "Fri" },
  { value: 6, short: "Sat" },
  { value: 0, short: "Sun" },
];

export type ExercisePlanDraft = {
  key: string;
  label: string;
  daysOfWeek: number[];
  scheduledTime: Date;
  notes: string;
};

export function defaultExercisePlanDraft(): ExercisePlanDraft {
  const d = new Date();
  d.setHours(8, 0, 0, 0);
  return {
    key: `new-${Date.now()}`,
    label: "",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    scheduledTime: d,
    notes: "",
  };
}

export function isExercisePlanDraftValid(draft: ExercisePlanDraft): boolean {
  return draft.label.trim().length > 0 && draft.daysOfWeek.length > 0;
}

function parseLocalYmdToDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d);
}

/** Plans scheduled for a given local calendar day. */
export function exercisePlansForLocalDate(
  plans: PetExercisePlan[],
  localYmd: string,
): PetExercisePlan[] {
  const dow = parseLocalYmdToDate(localYmd).getDay();
  return plans.filter((p) => (p.days_of_week ?? []).includes(dow));
}

/**
 * Daily progress / reminder target for exercise.
 * Prefers plans matching today; falls back to legacy `exercises_per_day`.
 */
export function dailyProgressExerciseTarget(
  details: {
    exercise_plans?: PetExercisePlan[] | null;
    exercises_per_day?: number | null;
    exercise?: { walks_per_day: number | null } | null;
  },
  localYmd: string = getLocalYmd(),
): number {
  const plans = details.exercise_plans ?? [];
  if (plans.length > 0) {
    return exercisePlansForLocalDate(plans, localYmd).length;
  }
  return (
    details.exercises_per_day ?? details.exercise?.walks_per_day ?? 0
  );
}

export function formatDaysOfWeekShort(days: number[]): string {
  if (days.length === 0) return "—";
  if (days.length === 7) return "Every day";
  const set = new Set(days);
  return EXERCISE_DOW_OPTIONS.filter((o) => set.has(o.value))
    .map((o) => o.short)
    .join(", ");
}

export function formatExercisePlanSubline(
  plan: Pick<PetExercisePlan, "days_of_week" | "scheduled_time"> | ExercisePlanDraft,
  timeDisplay: UserTimeDisplay,
): string {
  const days =
    "daysOfWeek" in plan
      ? formatDaysOfWeekShort(plan.daysOfWeek)
      : formatDaysOfWeekShort(plan.days_of_week ?? []);
  const time =
    "scheduledTime" in plan
      ? formatUserTime(plan.scheduledTime, timeDisplay)
      : formatFeedTimeAsUser(plan.scheduled_time, timeDisplay);
  return `${days} · ${time}`;
}

function formatFeedTimeAsUser(
  pgTime: string,
  timeDisplay: UserTimeDisplay,
): string {
  const [hStr, mStr] = pgTime.split(":");
  const d = new Date();
  d.setHours(parseInt(hStr ?? "8", 10) || 0, parseInt(mStr ?? "0", 10) || 0, 0, 0);
  return formatUserTime(d, timeDisplay);
}

export function sortExercisePlanDraftsByTime(
  plans: ExercisePlanDraft[],
): ExercisePlanDraft[] {
  return [...plans].sort((a, b) => {
    const ma = a.scheduledTime.getHours() * 60 + a.scheduledTime.getMinutes();
    const mb = b.scheduledTime.getHours() * 60 + b.scheduledTime.getMinutes();
    return ma - mb;
  });
}
