/**
 * Option lists used by the medication edit screen.
 */

import type { MedicationDosePeriod } from "@/types/database";

export const DOSAGE_TYPES: string[] = [
  "Tablet",
  "Injection",
  "Liquid",
  "Topical",
  "Chewable",
  "Other",
];

export type SchedulePeriod = MedicationDosePeriod | "custom";

export const SCHEDULE_PERIOD_OPTIONS: {
  label: string;
  value: SchedulePeriod;
}[] = [
  { label: "Per day", value: "day" },
  { label: "Per week", value: "week" },
  { label: "Per month", value: "month" },
  { label: "Custom", value: "custom" },
];

export const INTERVAL_UNIT_OPTIONS: {
  label: string;
  value: MedicationDosePeriod;
}[] = [
  { label: "days", value: "day" },
  { label: "weeks", value: "week" },
  { label: "months", value: "month" },
];
