import { isMedicationDueToday } from "@/lib/healthTraffic";
import type { PetActivity, PetMedication } from "@/types/database";

export type MedicationDosageProgress = {
  current: number;
  total: number;
  lastTaken?: string;
  /** True when total === 0 (nothing due today) or current >= total. */
  isComplete: boolean;
};

function formatLastTaken(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Expected doses for *today* from the medication schedule string.
 * Weekly/monthly schedules: 1 dose on days the med is due, else 0.
 */
export function getExpectedDosesToday(m: PetMedication): number {
  const f = (m.frequency ?? "").toLowerCase();
  const weeklyLike =
    (f.includes("week") ||
      f.includes("month") ||
      f.includes("quarter") ||
      f.includes("year")) &&
    !f.includes("daily");

  if (weeklyLike) {
    return isMedicationDueToday(m) ? 1 : 0;
  }

  if (
    f.includes("twice") ||
    f.includes("2x") ||
    f.includes(" bid") ||
    f.includes("bid ") ||
    f === "bid" ||
    f.includes("12 hour") ||
    f.includes("every 12")
  ) {
    return 2;
  }
  if (
    f.includes("three") ||
    f.includes("3x") ||
    f.includes("tid") ||
    f.includes("3 times")
  ) {
    return 3;
  }
  if (
    f.includes("four") ||
    f.includes("4x") ||
    f.includes("qid") ||
    f.includes("4 times")
  ) {
    return 4;
  }

  return 1;
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
    sorted[0]?.logged_at != null ? formatLastTaken(sorted[0].logged_at) : undefined;

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
