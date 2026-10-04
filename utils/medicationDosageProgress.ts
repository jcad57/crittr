import type { PetActivity, PetMedication } from "@/types/database";
import { getExpectedDosesForLocalDate } from "@/utils/buildSchedulePlan";
import { getLocalYmd } from "@/utils/localCalendarDate";
import { isLastGivenOccurrence } from "@/utils/medicationDueSchedule";
import type { UserTimeDisplay } from "@/utils/userDateTimeFormat";
import { formatUserTime } from "@/utils/userDateTimeFormat";

export type MedicationDosageProgress = {
  current: number;
  total: number;
  lastTaken?: string;
  /** True when total === 0 (nothing due today) or current >= total. */
  isComplete: boolean;
};

function formatLastTaken(
  iso: string,
  timeDisplay: UserTimeDisplay,
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return formatUserTime(d, timeDisplay);
}

/**
 * Expected doses for *today* from structured schedule or legacy frequency string.
 * Interval schedules: slot count on due days, else 0.
 */
export function getExpectedDosesToday(m: PetMedication): number {
  const todayYmd = getLocalYmd();
  // Last given on this day satisfies today's interval dose (schedule still shows it complete).
  if (isLastGivenOccurrence(m, todayYmd)) return 0;
  return getExpectedDosesForLocalDate(m, todayYmd);
}

export function countMedicationLogsTodayForMed(
  activities: PetActivity[],
  petId: string,
  medicationId: string,
): number {
  return activities.filter(
    (a) =>
      a.pet_id === petId &&
      a.activity_type === "medication" &&
      a.medication_id === medicationId,
  ).length;
}

export function buildMedicationDosageProgress(
  m: PetMedication,
  activities: PetActivity[],
  petId: string,
  timeDisplay: UserTimeDisplay = "12h",
): MedicationDosageProgress {
  const total = getExpectedDosesToday(m);
  const raw = countMedicationLogsTodayForMed(activities, petId, m.id);
  const current = total === 0 ? 0 : Math.min(raw, total);

  const medActs = activities.filter(
    (a) =>
      a.pet_id === petId &&
      a.activity_type === "medication" &&
      a.medication_id === m.id,
  );
  const sorted = [...medActs].sort(
    (a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime(),
  );
  const lastTaken =
    sorted[0]?.logged_at != null
      ? formatLastTaken(sorted[0].logged_at, timeDisplay)
      : undefined;

  const isComplete = total === 0 ? true : current >= total;

  return { current, total, lastTaken, isComplete };
}

/** Sum of fulfilled doses vs sum of expected doses (for daily progress rings). */
export function sumMedicationDoseProgress(
  medications: PetMedication[],
  activities: PetActivity[],
  petId: string,
): { fulfilled: number; expected: number } {
  let fulfilled = 0;
  let expected = 0;
  for (const m of medications) {
    const exp = getExpectedDosesToday(m);
    const raw = countMedicationLogsTodayForMed(activities, petId, m.id);
    expected += exp;
    if (exp > 0) {
      fulfilled += Math.min(raw, exp);
    }
  }
  return { fulfilled, expected };
}
