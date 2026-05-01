import type { PetType } from "@/types/database";

export const ENERGY_OPTIONS = ["low", "medium", "high"] as const;

export const BREED_LABELS: Partial<Record<PetType, string>> = {
  dog: "Breed",
  cat: "Breed",
  fish: "Species",
  bird: "Species",
  reptile: "Species",
  small_mammal: "Type / Breed",
};

export const EXERCISE_PET_TYPES = new Set<PetType>([
  "dog",
  "cat",
  "small_mammal",
]);

export const AVATAR_SIZE = 100;

/** Vertical gap after stacked fields (matches original `inputSpacing`). */
export const PET_INFO_FIELD_MARGIN_BOTTOM = 12;

export function getBreedLabelForPetType(petType: string): string {
  return (petType && BREED_LABELS[petType as PetType]) ?? "Breed / Species";
}

export function shouldShowExerciseField(petType: string): boolean {
  return EXERCISE_PET_TYPES.has(petType as PetType);
}
