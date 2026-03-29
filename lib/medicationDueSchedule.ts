import type { MedicationDosePeriod, PetMedication } from "@/types/database";

/** How we widen the "due soon" window before the next due date. */
export type DueSoonScheduleKind = "daily" | "weekly_horizon" | "monthly_horizon";

const MS_PER_DAY = 86400000;

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseYmd(s: string): Date {
  const [y, m, d] = s.split("T")[0].split("-").map((x) => parseInt(x, 10));
  return new Date(y, m - 1, d);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + n);
  return startOfDay(x);
}

function addCalendarMonths(d: Date, months: number): Date {
  const x = new Date(d.getTime());
  const day = x.getDate();
  x.setMonth(x.getMonth() + months);
  if (x.getDate() < day) {
    x.setDate(0);
  }
  return startOfDay(x);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round(
    (startOfDay(b).getTime() - startOfDay(a).getTime()) / MS_PER_DAY,
  );
}

/** Anchor for scheduling: last dose, or when the med was added. */
export function medicationScheduleAnchor(m: PetMedication): Date {
  const last = m.last_given_on?.trim();
  if (last) return startOfDay(parseYmd(last));
  return startOfDay(parseYmd(m.created_at));
}

/**
 * Whether "due soon" uses a 3-day horizon (weekly-like) or 7-day (monthly-like).
 * Custom intervals follow the interval unit (days/weeks → 3, months → 7).
 */
export function dueSoonScheduleKind(m: PetMedication): DueSoonScheduleKind {
  const ic = m.interval_count;
  const iu = m.interval_unit;

  if (ic != null && ic > 0 && iu) {
    if (iu === "month") return "monthly_horizon";
    if (iu === "day" && ic === 1) return "daily";
    if (iu === "day") return "weekly_horizon";
    if (iu === "week") return "weekly_horizon";
  }

  const dp = m.dose_period ?? null;
  if (dp === "month") return "monthly_horizon";
  if (dp === "week") return "weekly_horizon";
  if (dp === "day") return "daily";

  const f = (m.frequency ?? "").toLowerCase();
  if (
    f.includes("daily") ||
    f.includes("times daily") ||
    /^\d+\s*times\s+daily/.test(f)
  ) {
    return "daily";
  }
  if (f.includes("month") || f.includes("monthly")) {
    return "monthly_horizon";
  }
  if (f.includes("week") || f.includes("weekly")) {
    return "weekly_horizon";
  }
  if (f.includes("every day") || f.includes("every 1 day")) {
    return "daily";
  }
  if (f.includes("every") && f.includes("month")) {
    return "monthly_horizon";
  }
  if (f.includes("every") && (f.includes("day") || f.includes("week"))) {
    return "weekly_horizon";
  }

  return "weekly_horizon";
}

/**
 * Next calendar due date from anchor + schedule, advanced until on/after today.
 * Returns null for daily / unknown schedules (use traffic heuristics instead).
 */
export function computeNextDueDate(m: PetMedication): Date | null {
  if (dueSoonScheduleKind(m) === "daily") return null;

  const anchor = medicationScheduleAnchor(m);
  const today = startOfDay(new Date());

  const ic = m.interval_count;
  const iu = m.interval_unit;

  if (ic != null && ic > 0 && iu) {
    if (iu === "day" && ic === 1) {
      return null;
    }
    if (iu === "day") {
      const step = Math.max(1, ic);
      let next = addDays(anchor, step);
      while (next < today) {
        next = addDays(next, step);
      }
      return next;
    }
    if (iu === "week") {
      const step = Math.max(1, ic) * 7;
      let next = addDays(anchor, step);
      while (next < today) {
        next = addDays(next, step);
      }
      return next;
    }
    if (iu === "month") {
      const step = Math.max(1, ic);
      let next = addCalendarMonths(anchor, step);
      while (next < today) {
        next = addCalendarMonths(next, step);
      }
      return next;
    }
  }

  const dp = m.dose_period ?? null;

  if (dp === "week") {
    let next = addDays(anchor, 7);
    while (next < today) {
      next = addDays(next, 7);
    }
    return next;
  }

  if (dp === "month") {
    let next = addCalendarMonths(anchor, 1);
    while (next < today) {
      next = addCalendarMonths(next, 1);
    }
    return next;
  }

  const f = (m.frequency ?? "").toLowerCase();
  if (f.includes("week") || f.includes("weekly")) {
    let next = addDays(anchor, 7);
    while (next < today) {
      next = addDays(next, 7);
    }
    return next;
  }
  if (f.includes("month") || f.includes("monthly")) {
    let next = addCalendarMonths(anchor, 1);
    while (next < today) {
      next = addCalendarMonths(next, 1);
    }
    return next;
  }

  return null;
}

/** Days from today to `due` (positive = due in the future, 0 = today, negative = overdue). */
export function daysFromTodayTo(due: Date): number {
  return daysBetween(startOfDay(new Date()), startOfDay(due));
}

/** Computed next due from schedule + anchor, else explicit `next_due_date` if set. */
export function resolveNextDueDate(m: PetMedication): Date | null {
  const computed = computeNextDueDate(m);
  if (computed) return computed;
  const raw = m.next_due_date?.trim();
  if (!raw) return null;
  try {
    return startOfDay(parseYmd(raw));
  } catch {
    return null;
  }
}

export const DUE_SOON_DAYS_WEEKLY = 3;
export const DUE_SOON_DAYS_MONTHLY = 7;

export function dueSoonWindowForKind(kind: DueSoonScheduleKind): number {
  if (kind === "daily") return 0;
  if (kind === "monthly_horizon") return DUE_SOON_DAYS_MONTHLY;
  return DUE_SOON_DAYS_WEEKLY;
}
