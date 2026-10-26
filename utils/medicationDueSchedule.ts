import type { PetMedication } from "@/types/database";

/** How we widen the "due soon" window before the next due date. */
export type DueSoonScheduleKind = "daily" | "weekly_horizon" | "monthly_horizon";

const MS_PER_DAY = 86400000;

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function parseYmdToLocalDate(s: string): Date {
  const [y, m, d] = s.split("T")[0].split("-").map((x) => parseInt(x, 10));
  return new Date(y, m - 1, d);
}

export function toLocalYmd(d: Date): string {
  const x = startOfDay(d);
  const y = x.getFullYear();
  const mo = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

export function lastGivenYmd(m: PetMedication): string | null {
  const raw = m.last_given_on?.trim();
  if (!raw) return null;
  return raw.split("T")[0].slice(0, 10);
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
  const last = lastGivenYmd(m);
  if (last) return startOfDay(parseYmdToLocalDate(last));
  return startOfDay(parseYmdToLocalDate(m.created_at));
}

export function isDailyMedicationSchedule(m: PetMedication): boolean {
  return dueSoonScheduleKind(m) === "daily";
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
  if (
    f.includes("annual") ||
    f.includes("yearly") ||
    f.includes("once a year")
  ) {
    return "monthly_horizon";
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
 * Next calendar due date from last given (or created_at) + cadence.
 *
 * Last given is a completed occurrence, so the next due is one interval later.
 * With no last given, the first due is the day the medication was added.
 * Overdue dates are returned as-is (not rolled forward to the next future slot).
 * Returns null for daily schedules.
 */
export function computeNextDueDate(
  m: PetMedication,
  _now: Date = new Date(),
): Date | null {
  if (dueSoonScheduleKind(m) === "daily") return null;

  const anchor = medicationScheduleAnchor(m);
  const hasLastGiven = lastGivenYmd(m) != null;

  const next = hasLastGiven
    ? advanceMedicationDueDate(m, anchor)
    : startOfDay(anchor);
  return next;
}

/** Days from today to `due` (positive = due in the future, 0 = today, negative = overdue). */
export function daysFromTodayTo(due: Date): number {
  return daysBetween(startOfDay(new Date()), startOfDay(due));
}

/** Computed next due from schedule + anchor, else explicit `next_due_date` if set. */
export function resolveNextDueDate(
  m: PetMedication,
  now: Date = new Date(),
): Date | null {
  const computed = computeNextDueDate(m, now);
  if (computed) return computed;
  const raw = m.next_due_date?.trim();
  if (!raw) return null;
  try {
    return startOfDay(parseYmdToLocalDate(raw));
  } catch {
    return null;
  }
}

/**
 * Next due calendar day after `fromDue` for non-daily schedules; mirrors the
 * step size inside {@link computeNextDueDate}. Returns null for daily / unknown.
 */
export function advanceMedicationDueDate(
  m: PetMedication,
  fromDue: Date,
): Date | null {
  if (dueSoonScheduleKind(m) === "daily") return null;
  const start = startOfDay(fromDue);

  const ic = m.interval_count;
  const iu = m.interval_unit;

  if (ic != null && ic > 0 && iu) {
    if (iu === "day" && ic === 1) return null;
    if (iu === "day") return addDays(start, Math.max(1, ic));
    if (iu === "week") return addDays(start, Math.max(1, ic) * 7);
    if (iu === "month") return addCalendarMonths(start, Math.max(1, ic));
  }

  const dp = m.dose_period ?? null;
  if (dp === "week") return addDays(start, 7);
  if (dp === "month") return addCalendarMonths(start, 1);

  const f = (m.frequency ?? "").toLowerCase();
  if (f.includes("week") || f.includes("weekly")) return addDays(start, 7);
  if (f.includes("month") || f.includes("monthly")) {
    return addCalendarMonths(start, 1);
  }
  if (f.includes("annual") || f.includes("yearly")) {
    return addCalendarMonths(start, 12);
  }
  if (f.includes("every") && f.includes("month")) {
    return addCalendarMonths(start, 1);
  }
  if (f.includes("every") && (f.includes("day") || f.includes("week"))) {
    return addDays(start, 7);
  }

  return null;
}

const DEFAULT_MED_REMINDER_FUTURE_DATES = 48;

/**
 * Upcoming calendar due dates (local midnight) for interval medications.
 * Empty when the med is daily or {@link resolveNextDueDate} is unknown.
 */
export function enumerateUpcomingMedicationDueDates(
  m: PetMedication,
  maxCount: number = DEFAULT_MED_REMINDER_FUTURE_DATES,
  now: Date = new Date(),
): Date[] {
  if (dueSoonScheduleKind(m) === "daily") return [];
  const first = resolveNextDueDate(m, now);
  if (!first) return [];

  const today = startOfDay(now);
  let cur = startOfDay(first);
  while (cur < today) {
    const next = advanceMedicationDueDate(m, cur);
    if (!next) return [];
    cur = startOfDay(next);
  }

  const out: Date[] = [];
  for (let i = 0; i < maxCount; i++) {
    out.push(cur);
    const next = advanceMedicationDueDate(m, cur);
    if (!next) break;
    cur = startOfDay(next);
  }
  return out;
}

export const DUE_SOON_DAYS_WEEKLY = 3;
export const DUE_SOON_DAYS_MONTHLY = 7;

export function dueSoonWindowForKind(kind: DueSoonScheduleKind): number {
  if (kind === "daily") return 0;
  if (kind === "monthly_horizon") return DUE_SOON_DAYS_MONTHLY;
  return DUE_SOON_DAYS_WEEKLY;
}

/** How many doses belong on a due day (reminder slots / doses_per_period). */
export function dosesOnDueDay(m: PetMedication): number {
  const n = m.doses_per_period;
  if (n != null && n > 0) return Math.min(8, Math.max(1, Math.floor(n)));
  return 1;
}

export function isLastGivenOccurrence(
  m: PetMedication,
  localYmd: string,
): boolean {
  return lastGivenYmd(m) === localYmd;
}

/**
 * Whether this medication belongs on `localYmd`.
 * Daily: every day. Interval: last given (if set) and each step from there;
 * with no last given, the add day (`created_at`) is the first due day.
 */
export function isMedicationDueOnLocalDate(
  m: PetMedication,
  localYmd: string,
): boolean {
  if (dueSoonScheduleKind(m) === "daily") return true;

  const target = startOfDay(parseYmdToLocalDate(localYmd));
  const lastGiven = lastGivenYmd(m);
  const anchor = medicationScheduleAnchor(m);

  if (lastGiven) {
    const given = startOfDay(parseYmdToLocalDate(lastGiven));
    if (target.getTime() === given.getTime()) return true;
    if (target.getTime() < given.getTime()) return false;
    let cur = given;
    let guard = 0;
    while (cur.getTime() < target.getTime() && guard < 2000) {
      const next = advanceMedicationDueDate(m, cur);
      if (!next || next.getTime() <= cur.getTime()) return false;
      cur = startOfDay(next);
      guard += 1;
    }
    return cur.getTime() === target.getTime();
  }

  if (target.getTime() < anchor.getTime()) return false;
  let cur = startOfDay(anchor);
  let guard = 0;
  while (cur.getTime() < target.getTime() && guard < 2000) {
    const next = advanceMedicationDueDate(m, cur);
    if (!next || next.getTime() <= cur.getTime()) return false;
    cur = startOfDay(next);
    guard += 1;
  }
  return cur.getTime() === target.getTime();
}
