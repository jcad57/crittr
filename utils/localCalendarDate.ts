/** Local calendar date as YYYY-MM-DD (device timezone). */
export function getLocalYmd(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function msUntilNextLocalMidnight(): number {
  const now = new Date();
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  return Math.max(1, next.getTime() - now.getTime());
}

/** Midnight at the start of the next local calendar day (expiry must be after "today"). */
export function startOfTomorrowLocal(from = new Date()): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() + 1);
  return d;
}

/** Same local calendar day plus `years` (handles leap years via JS Date). */
export function addCalendarYearsLocal(from: Date, years: number): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setFullYear(d.getFullYear() + years);
  return d;
}

/** Default vaccination next-expiry / expires-on field (one calendar year ahead). */
export function defaultVaccinationExpiryYmd(): string {
  return getLocalYmd(addCalendarYearsLocal(new Date(), 1));
}

/** Upper bound for vaccination expiry picker (~50 years). */
export function vaccinationExpiryPickerMaxDate(from = new Date()): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setFullYear(d.getFullYear() + 50);
  return d;
}
