/**
 * Age in calendar years/months from a YYYY-MM-DD birth date (local date).
 */
export function yearsMonthsFromBirthDate(isoDate: string): {
  years: number;
  months: number;
} {
  const parts = isoDate.trim().split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) return { years: 0, months: 0 };

  const birth = new Date(y, m - 1, d);
  const today = new Date();

  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  const dayDiff = today.getDate() - birth.getDate();
  if (dayDiff < 0) months--;
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years < 0) return { years: 0, months: 0 };
  return { years, months };
}
