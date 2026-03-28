import type { Pet } from "@/types/database";
import {
  formatPetAgeDisplay,
  formatPetTypeLabel,
  formatPetWeightDisplay,
} from "@/utils/petDisplay";

export function formatPetListSubline(pet: Pet): string {
  const breed = pet.breed?.trim() || formatPetTypeLabel(pet.pet_type);
  const sex =
    pet.sex === "female"
      ? "Female"
      : pet.sex === "male"
        ? "Male"
        : "—";
  const hasAge =
    pet.age != null || (pet.age_months != null && pet.age_months > 0);
  const age = hasAge ? formatPetAgeDisplay(pet) : "—";
  return `${breed} · ${sex} · ${age}`;
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
