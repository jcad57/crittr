import { getLocalYmd } from "@/utils/localCalendarDate";

/** How far ahead the strip lets the user plan. */
export const SCHEDULE_DAYS_AFTER = 90;

/**
 * Past window used before the signup date is known. Generous on purpose:
 * collapsing to today would leave the user with no selectable history on the
 * frames before the session resolves.
 */
export const SCHEDULE_FALLBACK_DAYS_BEFORE = 365;

/** Upper bound on how many day cards we build up front (~5 years of history). */
export const SCHEDULE_MAX_DAYS_BEFORE = 1825;

function ymdParts(ymd: string): [number, number, number] {
  const [y, m, d] = ymd.split("-").map((n) => parseInt(n, 10));
  return [y!, m!, d!];
}

/** Whole days from `fromYmd` to `toYmd`; negative when `toYmd` is earlier. */
export function daysBetweenYmd(fromYmd: string, toYmd: string): number {
  const [ay, am, ad] = ymdParts(fromYmd);
  const [by, bm, bd] = ymdParts(toYmd);
  return Math.round(
    (Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000,
  );
}

export function addDaysToYmd(ymd: string, days: number): string {
  const [y, m, d] = ymdParts(ymd);
  return getLocalYmd(new Date(y, m - 1, d + days));
}

/** Local calendar day an ISO timestamp falls on, or null if unparseable. */
export function ymdFromIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : getLocalYmd(d);
}

/**
 * Earliest selectable day on the schedule strip: the day the user signed up.
 *
 * Clamped so a clock skew or a bad timestamp can't push the start into the
 * future (which would leave zero past days) or so far back that we'd build
 * tens of thousands of cards.
 */
export function scheduleRangeStartYmd(
  signupYmd: string | null | undefined,
  todayYmd: string,
): string {
  if (!signupYmd) {
    return addDaysToYmd(todayYmd, -SCHEDULE_FALLBACK_DAYS_BEFORE);
  }

  const daysBack = daysBetweenYmd(signupYmd, todayYmd);
  if (daysBack <= 0) return todayYmd;
  if (daysBack > SCHEDULE_MAX_DAYS_BEFORE) {
    return addDaysToYmd(todayYmd, -SCHEDULE_MAX_DAYS_BEFORE);
  }
  return signupYmd;
}

/** Total day cards for a strip starting at `startYmd` and running `SCHEDULE_DAYS_AFTER` past today. */
export function scheduleRangeLength(startYmd: string, todayYmd: string): number {
  return Math.max(1, daysBetweenYmd(startYmd, todayYmd) + SCHEDULE_DAYS_AFTER + 1);
}
