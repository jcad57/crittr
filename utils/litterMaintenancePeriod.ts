import type { LitterCleaningPeriod } from "@/types/database";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Local midnight for the given calendar day. */
export function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** ISO week: Monday as first day of week. */
export function startOfLocalWeekMonday(d: Date): Date {
  const x = startOfLocalDay(d);
  const day = x.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + offset);
  return x;
}

export function startOfLocalMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

export function maintenancePeriodStart(
  period: LitterCleaningPeriod | null | undefined,
  ref: Date = new Date(),
): Date {
  const p = period ?? "day";
  if (p === "week") return startOfLocalWeekMonday(ref);
  if (p === "month") return startOfLocalMonth(ref);
  return startOfLocalDay(ref);
}

export function formatLocalYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
