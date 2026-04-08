import type { Pet } from "@/types/database";
import { yearsMonthsFromBirthDate } from "@/utils/petAge";
import {
  formatPetTypeLabel,
  formatPetWeightDisplay,
  parseDateOnlyYmd,
} from "@/utils/petDisplay";

/** Breed line (custom breed or pet type label). */
export function getPetListBreedLabel(pet: Pet): string {
  const b = pet.breed?.trim();
  if (b) return b;
  return formatPetTypeLabel(pet.pet_type);
}

/**
 * Compact age for pet list cards, e.g. "6 yrs", "1 yr", "<1 yr", or "—".
 * Uses stored `age` / `age_months` when present; otherwise derives from `date_of_birth`.
 */
export function getPetAgeCompactYrs(pet: Pet): string {
  const storedY = pet.age;
  const storedM = pet.age_months;
  const hasStored =
    storedY != null || (storedM != null && storedM > 0);

  if (hasStored) {
    const y = storedY ?? 0;
    const mo = storedM ?? 0;
    if (y === 0 && mo > 0) return "<1 yr";
    if (y === 0 && mo === 0) return "<1 yr";
    if (y === 1) return "1 yr";
    return `${y} yrs`;
  }

  const dobRaw =
    typeof pet.date_of_birth === "string"
      ? pet.date_of_birth
      : pet.date_of_birth != null
        ? String(pet.date_of_birth)
        : "";
  const ymd = parseDateOnlyYmd(dobRaw);
  if (ymd) {
    const { years, months } = yearsMonthsFromBirthDate(ymd);
    if (years === 0) return "<1 yr";
    if (years === 1) return "1 yr";
    return `${years} yrs`;
  }

  return "—";
}

/** Breed · sex and age separately so My Pets can stack age on narrow screens. */
export function getPetListSublineParts(pet: Pet): { primary: string; age: string } {
  const breed = getPetListBreedLabel(pet);
  const sex =
    pet.sex === "female"
      ? "Female"
      : pet.sex === "male"
        ? "Male"
        : "—";
  const age = getPetAgeCompactYrs(pet);
  return {
    primary: `${breed} · ${sex}`,
    age,
  };
}

export function formatPetListSubline(pet: Pet): string {
  const { primary, age } = getPetListSublineParts(pet);
  return `${primary} · ${age}`;
}

/** Quick-glance tags for the pets list cards. */
export function buildPetListTags(pet: Pet): string[] {
  const tags: string[] = [];
  if (pet.is_sterilized === true) {
    tags.push(pet.sex === "female" ? "Spayed" : "Neutered");
  }
  if (pet.is_microchipped === true) tags.push("Microchipped");
  if (pet.is_insured === true) tags.push("Insured");
  return tags;
}

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Placeholder weekly stats until activity aggregates exist. */
export function petListPreviewStats(pet: Pet) {
  const h = hashId(pet.id);
  const isDog = pet.pet_type === "dog";
  const primaryLabel = isDog ? "Walks" : "Play sessions";
  const primaryValue = isDog ? 8 + (h % 15) : 6 + (h % 12);
  const meals = 12 + (h % 20);
  const weightLine = formatPetWeightDisplay(pet);
  return {
    primaryLabel,
    primaryValue,
    meals,
    weightLine,
  };
}
