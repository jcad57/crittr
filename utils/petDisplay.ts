import type { Pet } from "@/types/database";

export function formatPetAgeDisplay(
  pet: Pick<Pet, "age" | "age_months">,
): string {
  const y = pet.age ?? 0;
  const m = pet.age_months;
  if (m != null && m > 0) return `${y} yr ${m} mo`;
  return `${y} yr`;
}

/** Age for compact list lines (e.g. My pets): years only, no months. */
export function formatPetAgeYearsOld(
  pet: Pick<Pet, "age" | "age_months">,
): string {
  const y = pet.age ?? 0;
  const m = pet.age_months;
  const hasAny =
    pet.age != null || (m != null && m > 0);
  if (!hasAny) return "—";
  if (y === 0 && m != null && m > 0) return "Less than 1 year old";
  return y === 1 ? "1 year old" : `${y} years old`;
}

export function formatPetWeightDisplay(
  pet: Pick<Pet, "weight_lbs" | "weight_unit">,
): string {
  const w = pet.weight_lbs;
  const u = pet.weight_unit;
  if (w == null || !u) return "—";
  const unitLabel = u === "kg" ? "kg" : "lb";
  return `${w} ${unitLabel}`;
}

export function formatPetTypeLabel(petType: string | null): string {
  if (!petType) return "—";
  return petType.charAt(0).toUpperCase() + petType.slice(1);
}

export function formatEnergyLabel(
  level: "low" | "medium" | "high" | null,
): string {
  if (!level) return "—";
  return level.charAt(0).toUpperCase() + level.slice(1);
}

export function formatMicrochipLabel(value: boolean | null): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "—";
}

/**
 * Extract YYYY-MM-DD from Supabase `date` or ISO strings.
 * Avoids parsing full timestamps with `new Date(iso)` (UTC vs local shifts the calendar day).
 */
export function parseDateOnlyYmd(
  input: string | null | undefined,
): string | null {
  if (input == null) return null;
  const s = String(input).trim();
  if (!s) return null;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function calendarPartsFromYmd(ymd: string): { y: number; m: number; d: number } | null {
  const parts = ymd.split("-").map(Number);
  const y = parts[0];
  const mo = parts[1];
  const d = parts[2];
  if (
    !y ||
    !mo ||
    !d ||
    mo < 1 ||
    mo > 12 ||
    d < 1 ||
    d > 31
  ) {
    return null;
  }
  return { y, m: mo, d };
}

export function formatDateOfBirth(iso: string | null): string | null {
  const ymd = parseDateOnlyYmd(iso);
  if (!ymd) return null;
  const parts = calendarPartsFromYmd(ymd);
  if (!parts) return null;
  const date = new Date(parts.y, parts.m - 1, parts.d);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Short label for stat chips, e.g. "Apr '21". */
export function formatBirthdayChip(iso: string | null): string {
  const ymd = parseDateOnlyYmd(iso);
  if (!ymd) return "—";
  const parts = calendarPartsFromYmd(ymd);
  if (!parts) return "—";
  const mon = MONTH_SHORT[parts.m - 1] ?? "—";
  const yr = String(parts.y).slice(-2);
  return `${mon} '${yr}`;
}
