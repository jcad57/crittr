import type { PetWeightEntry } from "@/types/database";

export type WeightHistoryRange = "1W" | "1M" | "3M" | "6M" | "1Y" | "ALL";

export type WeightHistoryRangeOption = {
  id: WeightHistoryRange;
  label: string;
};

export const WEIGHT_HISTORY_RANGE_OPTIONS: WeightHistoryRangeOption[] = [
  { id: "1W", label: "1W" },
  { id: "1M", label: "1M" },
  { id: "3M", label: "3M" },
  { id: "6M", label: "6M" },
  { id: "1Y", label: "1Y" },
  { id: "ALL", label: "All" },
];

export type WeightChartPoint = {
  /** Timestamp at midnight local for the recorded date. */
  ts: number;
  /** Weight value in `unit`. */
  value: number;
  /** ISO date `YYYY-MM-DD` for the entry — used for tooltip + axis labels. */
  recordedAt: string;
  /** `lbs` or `kg`. All values normalized to a single unit upstream. */
  unit: "lbs" | "kg";
  /** Underlying weight entry id, to deep link from chart taps to edit. */
  entryId: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function rangeStartTimestamp(
  range: WeightHistoryRange,
  now: Date = new Date(),
): number | null {
  if (range === "ALL") return null;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (range) {
    case "1W":
      start.setDate(start.getDate() - 6);
      break;
    case "1M":
      start.setMonth(start.getMonth() - 1);
      break;
    case "3M":
      start.setMonth(start.getMonth() - 3);
      break;
    case "6M":
      start.setMonth(start.getMonth() - 6);
      break;
    case "1Y":
      start.setFullYear(start.getFullYear() - 1);
      break;
  }
  return start.getTime();
}

function lbsToUnit(weightLbs: number, target: "lbs" | "kg"): number {
  if (target === "kg") return Math.round(weightLbs * 0.45359237 * 100) / 100;
  return Math.round(weightLbs * 100) / 100;
}

function kgToUnit(weightKg: number, target: "lbs" | "kg"): number {
  if (target === "lbs") return Math.round((weightKg / 0.45359237) * 100) / 100;
  return Math.round(weightKg * 100) / 100;
}

/**
 * Normalize a single weight entry to the requested display unit. We assume
 * `weight_lbs` is always the value supplied (matching the existing column
 * name) and `weight_unit` describes which unit the user actually entered.
 */
export function entryValueInUnit(
  entry: PetWeightEntry,
  target: "lbs" | "kg",
): number {
  const stored = Number(entry.weight_lbs);
  if (!Number.isFinite(stored)) return 0;
  return entry.weight_unit === "kg"
    ? kgToUnit(stored, target)
    : lbsToUnit(stored, target);
}

function timestampForRecordedAt(recordedAt: string): number {
  const d = new Date(`${recordedAt}T12:00:00`);
  return Number.isFinite(d.getTime()) ? d.getTime() : Date.now();
}

/** Convert raw entries to chart points in the requested display unit. */
export function entriesToChartPoints(
  entries: PetWeightEntry[],
  unit: "lbs" | "kg",
): WeightChartPoint[] {
  return entries.map((e) => ({
    ts: timestampForRecordedAt(e.recorded_at),
    value: entryValueInUnit(e, unit),
    recordedAt: e.recorded_at,
    unit,
    entryId: e.id,
  }));
}

/** Filter chart points to the requested range, oldest → newest. */
export function pointsForRange(
  points: WeightChartPoint[],
  range: WeightHistoryRange,
  now: Date = new Date(),
): WeightChartPoint[] {
  const startTs = rangeStartTimestamp(range, now);
  if (startTs == null) return points;
  return points.filter((p) => p.ts >= startTs);
}

/** Most recent entry's display unit, falling back to the pet's preference. */
export function preferredUnit(
  entries: PetWeightEntry[],
  fallback: "lbs" | "kg" | null | undefined,
): "lbs" | "kg" {
  const last = entries[entries.length - 1];
  if (last?.weight_unit === "kg" || last?.weight_unit === "lbs") {
    return last.weight_unit;
  }
  return fallback === "kg" ? "kg" : "lbs";
}

export function formatWeightDelta(
  current: number,
  previous: number,
  unit: "lbs" | "kg",
): { sign: "up" | "down" | "flat"; label: string } {
  const diff = Math.round((current - previous) * 100) / 100;
  if (Math.abs(diff) < 0.01) {
    return { sign: "flat", label: `No change ${unit}` };
  }
  const sign = diff > 0 ? "up" : "down";
  const arrow = sign === "up" ? "▲" : "▼";
  return {
    sign,
    label: `${arrow} ${Math.abs(diff).toFixed(diff % 1 === 0 ? 0 : 1)} ${unit}`,
  };
}

/** "Apr 12" or "Apr 12, '24" depending on whether `includeYear` is set. */
export function formatChartDateLabel(ts: number, includeYear = false): string {
  const d = new Date(ts);
  const opts: Intl.DateTimeFormatOptions = includeYear
    ? { month: "short", day: "numeric", year: "2-digit" }
    : { month: "short", day: "numeric" };
  return d.toLocaleDateString("en-US", opts);
}

/** Number of days between the first and last point — used for label cadence. */
export function spanDays(points: WeightChartPoint[]): number {
  if (points.length < 2) return 0;
  return Math.round((points[points.length - 1].ts - points[0].ts) / DAY_MS);
}
