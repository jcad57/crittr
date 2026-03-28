import type { PetFormData } from "@/types/database";

export type PetInfoMissingFields = {
  name: boolean;
  breed: boolean;
  /** True when neither DOB nor years/months are filled in valid form. */
  ageYears: boolean;
  weight: boolean;
  sex: boolean;
  energyLevel: boolean;
  exercisesPerDay: boolean;
};

/** At least one of date of birth or years/months (non-empty numeric pair) is required. */
export function hasAgeOrDob(pet: PetFormData): boolean {
  if (pet.dateOfBirth.trim()) return true;
  const y = pet.ageYears.trim();
  const mo = pet.ageMonths.trim();
  if (y === "" && mo === "") return false;
  const yi = y === "" ? 0 : parseInt(y, 10);
  const mi = mo === "" ? 0 : parseInt(mo, 10);
  if (Number.isNaN(yi) || Number.isNaN(mi)) return false;
  return true;
}

export function getPetInfoMissingFields(
  pet: PetFormData,
  showExercise: boolean,
): PetInfoMissingFields {
  return {
    name: !pet.name.trim(),
    breed: !pet.breed.trim(),
    ageYears: !hasAgeOrDob(pet),
    weight: !pet.weight.trim(),
    sex: pet.sex === "",
    energyLevel: pet.energyLevel === "",
    exercisesPerDay: showExercise && !pet.exercisesPerDay.trim(),
  };
}

export function isPetInfoComplete(missing: PetInfoMissingFields): boolean {
  return !Object.values(missing).some(Boolean);
}
