import type { MedicationDosePeriod } from "@/types/database";

/** Human-readable label for "every N days/weeks/months" (stored in `frequency`). */
export function formatMedicationEveryIntervalLabel(
  count: number,
  unit: MedicationDosePeriod,
): string {
  const n = Math.floor(count);
  if (n < 1) return "Custom";
  if (n === 1) {
    if (unit === "day") return "Every day";
    if (unit === "week") return "Every week";
    return "Every month";
  }
  if (unit === "day") return `Every ${n} days`;
  if (unit === "week") return `Every ${n} weeks`;
  return `Every ${n} months`;
}

/** Persist a human-readable `frequency` for legacy heuristics + Health UI. */
export function buildMedicationFrequencyLabelForDb(
  dosePeriod: MedicationDosePeriod | null,
  dosesPerPeriod: number | null,
  customFrequency: string | null,
  interval?: { count: number; unit: MedicationDosePeriod } | null,
): string | null {
  if (
    interval != null &&
    interval.count > 0 &&
    (interval.unit === "day" ||
      interval.unit === "week" ||
      interval.unit === "month")
  ) {
    return formatMedicationEveryIntervalLabel(interval.count, interval.unit);
  }
  if (dosePeriod === "day" && dosesPerPeriod != null && dosesPerPeriod > 0) {
    return dosesPerPeriod === 1 ? "Daily" : `${dosesPerPeriod} times daily`;
  }
  if (dosePeriod === "week" && dosesPerPeriod != null && dosesPerPeriod > 0) {
    return dosesPerPeriod === 1 ? "Weekly" : `${dosesPerPeriod} times weekly`;
  }
  if (dosePeriod === "month" && dosesPerPeriod != null && dosesPerPeriod > 0) {
    return dosesPerPeriod === 1 ? "Monthly" : `${dosesPerPeriod} times monthly`;
  }
  if (dosePeriod === "week") return "Weekly";
  if (dosePeriod === "month") return "Monthly";
  const c = customFrequency?.trim();
  return c || null;
}

export function formatReminderTimeHHmm(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function parseReminderTimeHHmm(s: string | null | undefined): Date {
  const d = new Date();
  if (!s?.trim()) {
    d.setHours(9, 0, 0, 0);
    return d;
  }
  const [hh, mm] = s.split(":").map((x) => parseInt(x, 10));
  if (Number.isFinite(hh) && Number.isFinite(mm)) {
    d.setHours(hh, mm, 0, 0);
  } else {
    d.setHours(9, 0, 0, 0);
  }
  return d;
}
