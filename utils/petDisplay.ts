import type { Pet } from "@/types/database";

export function formatPetAgeDisplay(
  pet: Pick<Pet, "age" | "age_months">,
): string {
  const y = pet.age ?? 0;
  const m = pet.age_months;
  if (m != null && m > 0) return `${y} yr ${m} mo`;
  return `${y} yr`;
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

export function formatDateOfBirth(iso: string | null): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(`${iso.trim()}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Short label for stat chips, e.g. "Apr '21". */
export function formatBirthdayChip(iso: string | null): string {
  if (!iso?.trim()) return "—";
  const d = new Date(`${iso.trim()}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  const mon = d.toLocaleDateString("en-US", { month: "short" });
  const yr = String(d.getFullYear()).slice(-2);
  return `${mon} '${yr}`;
}
