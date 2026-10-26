/**
 * How often a pet medication is given.
 *
 * Presets map onto the existing `dose_period` + `interval_count` /
 * `interval_unit` columns so reminders, health badges, and the daily
 * schedule can share one cadence.
 */

import type { MedicationDosePeriod, PetMedication } from "@/types/database";
import { computeNextDueDate, toLocalYmd } from "./medicationDueSchedule";
import { formatMedicationEveryIntervalLabel } from "./medicationSchedule";

export type MedicationFrequencyKind =
  | "daily"
  | "every_other_day"
  | "weekly"
  | "every_other_week"
  | "monthly"
  | "every_n_months"
  | "annually";

export type MedicationFrequencyDraft = {
  kind: MedicationFrequencyKind;
  /** Used when `kind === "every_n_months"`. Integer >= 2. */
  monthInterval: number;
};

export const DEFAULT_FREQUENCY_DRAFT: MedicationFrequencyDraft = {
  kind: "daily",
  monthInterval: 2,
};

export const MIN_CUSTOM_MONTH_INTERVAL = 2;
export const MAX_CUSTOM_MONTH_INTERVAL = 24;

export const MEDICATION_FREQUENCY_OPTIONS: {
  kind: MedicationFrequencyKind;
  label: string;
}[] = [
  { kind: "daily", label: "Daily" },
  { kind: "every_other_day", label: "Every other day" },
  { kind: "weekly", label: "Weekly" },
  { kind: "every_other_week", label: "Every other week" },
  { kind: "monthly", label: "Monthly" },
  { kind: "every_n_months", label: "Every few months" },
  { kind: "annually", label: "Annually" },
];

export type MedicationScheduleDbFields = {
  dose_period: MedicationDosePeriod | null;
  interval_count: number | null;
  interval_unit: MedicationDosePeriod | null;
};

export function clampCustomMonthInterval(n: number): number {
  if (!Number.isFinite(n)) return MIN_CUSTOM_MONTH_INTERVAL;
  return Math.min(
    MAX_CUSTOM_MONTH_INTERVAL,
    Math.max(MIN_CUSTOM_MONTH_INTERVAL, Math.floor(n)),
  );
}

export function frequencyDraftToDbFields(
  draft: MedicationFrequencyDraft,
): MedicationScheduleDbFields {
  const months = clampCustomMonthInterval(draft.monthInterval);
  switch (draft.kind) {
    case "daily":
      return { dose_period: "day", interval_count: null, interval_unit: null };
    case "every_other_day":
      return { dose_period: "day", interval_count: 2, interval_unit: "day" };
    case "weekly":
      return { dose_period: "week", interval_count: null, interval_unit: null };
    case "every_other_week":
      return { dose_period: "week", interval_count: 2, interval_unit: "week" };
    case "monthly":
      return {
        dose_period: "month",
        interval_count: null,
        interval_unit: null,
      };
    case "every_n_months":
      return {
        dose_period: "month",
        interval_count: months,
        interval_unit: "month",
      };
    case "annually":
      return {
        dose_period: "month",
        interval_count: 12,
        interval_unit: "month",
      };
  }
}

export function frequencyDraftFromMed(
  m: Pick<
    PetMedication,
    "dose_period" | "interval_count" | "interval_unit" | "frequency"
  >,
): MedicationFrequencyDraft {
  const ic = m.interval_count;
  const iu = m.interval_unit;

  if (ic != null && ic > 0 && iu) {
    if (iu === "day" && ic === 1) return { ...DEFAULT_FREQUENCY_DRAFT };
    if (iu === "day" && ic === 2) {
      return { kind: "every_other_day", monthInterval: 2 };
    }
    if (iu === "week" && ic === 1) {
      return { kind: "weekly", monthInterval: 2 };
    }
    if (iu === "week" && ic === 2) {
      return { kind: "every_other_week", monthInterval: 2 };
    }
    if (iu === "week" && ic > 2) {
      return { kind: "every_other_week", monthInterval: 2 };
    }
    if (iu === "month" && ic === 1) {
      return { kind: "monthly", monthInterval: 2 };
    }
    if (iu === "month" && ic === 12) {
      return { kind: "annually", monthInterval: 2 };
    }
    if (iu === "month") {
      return {
        kind: "every_n_months",
        monthInterval: clampCustomMonthInterval(ic),
      };
    }
    if (iu === "day") {
      return { kind: "every_other_day", monthInterval: 2 };
    }
  }

  const dp = m.dose_period ?? null;
  if (dp === "week") return { kind: "weekly", monthInterval: 2 };
  if (dp === "month") return { kind: "monthly", monthInterval: 2 };
  if (dp === "day") return { ...DEFAULT_FREQUENCY_DRAFT };

  const f = (m.frequency ?? "").toLowerCase();
  if (
    f.includes("annual") ||
    f.includes("yearly") ||
    f.includes("once a year")
  ) {
    return { kind: "annually", monthInterval: 2 };
  }
  if (f.includes("every other week") || f.includes("every 2 weeks")) {
    return { kind: "every_other_week", monthInterval: 2 };
  }
  if (f.includes("every other day") || f.includes("every 2 days")) {
    return { kind: "every_other_day", monthInterval: 2 };
  }
  if (f.includes("month") || f.includes("monthly")) {
    const everyN = f.match(/every\s+(\d+)\s+months?/);
    if (everyN) {
      const n = parseInt(everyN[1]!, 10);
      if (n === 12) return { kind: "annually", monthInterval: 2 };
      if (n >= 2) {
        return {
          kind: "every_n_months",
          monthInterval: clampCustomMonthInterval(n),
        };
      }
    }
    return { kind: "monthly", monthInterval: 2 };
  }
  if (f.includes("week") || f.includes("weekly")) {
    return { kind: "weekly", monthInterval: 2 };
  }

  return { ...DEFAULT_FREQUENCY_DRAFT };
}

export function frequencyLabelForDraft(
  draft: MedicationFrequencyDraft,
): string {
  switch (draft.kind) {
    case "daily":
      return "Daily";
    case "every_other_day":
      return "Every other day";
    case "weekly":
      return "Weekly";
    case "every_other_week":
      return "Every other week";
    case "monthly":
      return "Monthly";
    case "every_n_months":
      return formatMedicationEveryIntervalLabel(
        clampCustomMonthInterval(draft.monthInterval),
        "month",
      );
    case "annually":
      return "Annually";
  }
}

export function frequencyHelperText(kind: MedicationFrequencyKind): string {
  switch (kind) {
    case "daily":
      return "This medication will appear on the schedule every day.";
    case "every_other_day":
      return "We'll remind you every other day from the last given date.";
    case "weekly":
      return "We'll remind you weekly from the last given date.";
    case "every_other_week":
      return "We'll remind you every 14 days from the last given date.";
    case "monthly":
      return "We'll remind you monthly from the last given date.";
    case "every_n_months":
      return "Choose how many months between doses. We'll count from the last given date.";
    case "annually":
      return "We'll remind you once a year from the last given date.";
  }
}

/** Collapsed frequency-card subtitle. */
export function frequencyReminderShortText(
  draft: MedicationFrequencyDraft,
): string {
  switch (draft.kind) {
    case "daily":
      return "We'll remind you every day.";
    case "every_other_day":
      return "We'll remind you every other day.";
    case "weekly":
      return "We'll remind you weekly.";
    case "every_other_week":
      return "We'll remind you every other week.";
    case "monthly":
      return "We'll remind you monthly.";
    case "every_n_months":
      return `We'll remind you every ${clampCustomMonthInterval(draft.monthInterval)} months.`;
    case "annually":
      return "We'll remind you annually.";
  }
}

export function lastGivenHelperText(
  kind: MedicationFrequencyKind,
  hasLastGiven: boolean,
): string {
  if (kind === "daily") {
    return "Optional. We’ll mark that day as given on the schedule.";
  }
  if (!hasLastGiven) {
    return "Add when this was last given so we can schedule the next dose. If you skip it, the first dose is due today.";
  }
  return "We’ll mark this day as given and schedule the next dose from here.";
}

export function dosageScheduleHint(_kind: MedicationFrequencyKind): string {
  return "These times appear on the schedule when this medication is due.";
}

/** Next due YYYY-MM-DD for the frequency picker preview. Null for daily. */
export function nextDueYmdFromDraft(
  draft: MedicationFrequencyDraft,
  lastGivenOn: string,
  now: Date = new Date(),
): string | null {
  if (draft.kind === "daily") return null;
  const db = frequencyDraftToDbFields(draft);
  const stub: PetMedication = {
    id: "preview",
    pet_id: "preview",
    name: "preview",
    dosage: null,
    frequency: frequencyLabelForDraft(draft),
    condition: null,
    notes: null,
    doses_per_period: 1,
    dose_period: db.dose_period,
    interval_count: db.interval_count,
    interval_unit: db.interval_unit,
    last_given_on: lastGivenOn.trim() || null,
    created_at: now.toISOString(),
  };
  const next = computeNextDueDate(stub, now);
  return next ? toLocalYmd(next) : null;
}

export function schedulePeriodFromFrequencyKind(
  kind: MedicationFrequencyKind,
): "day" | "week" | "month" | "custom" {
  switch (kind) {
    case "daily":
    case "every_other_day":
      return "day";
    case "weekly":
    case "every_other_week":
      return "week";
    case "monthly":
      return "month";
    case "every_n_months":
    case "annually":
      return "custom";
  }
}

export function frequencyDraftFromFormEntry(entry: {
  frequencyKind?: MedicationFrequencyKind | null;
  customMonthCount?: string | null;
  schedulePeriod?: "day" | "week" | "month" | "custom" | null;
  customIntervalCount?: string | null;
  customIntervalUnit?: MedicationDosePeriod | null;
}): MedicationFrequencyDraft {
  if (entry.frequencyKind) {
    return {
      kind: entry.frequencyKind,
      monthInterval: clampCustomMonthInterval(
        parseInt(entry.customMonthCount ?? "2", 10) || 2,
      ),
    };
  }
  if (entry.schedulePeriod === "custom") {
    const n = parseInt(entry.customIntervalCount ?? "1", 10);
    return frequencyDraftFromMed({
      dose_period: "month",
      interval_count: Number.isFinite(n) ? n : 2,
      interval_unit: entry.customIntervalUnit ?? "month",
      frequency: null,
    });
  }
  return frequencyDraftFromMed({
    dose_period: entry.schedulePeriod ?? "day",
    interval_count: null,
    interval_unit: null,
    frequency: null,
  });
}
