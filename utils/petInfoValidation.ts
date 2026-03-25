import type { PetFormData } from "@/types/database";

export type PetInfoMissingFields = {
  name: boolean;
  breed: boolean;
  ageYears: boolean;
  weight: boolean;
  sex: boolean;
  energyLevel: boolean;
  exercisesPerDay: boolean;
};

export function getPetInfoMissingFields(
  pet: PetFormData,
  showExercise: boolean,
): PetInfoMissingFields {
  return {
    name: !pet.name.trim(),
    breed: !pet.breed.trim(),
    ageYears: !pet.ageYears.trim(),
    weight: !pet.weight.trim(),
    sex: pet.sex === "",
    energyLevel: pet.energyLevel === "",
    exercisesPerDay: showExercise && !pet.exercisesPerDay.trim(),
  };
}

export function isPetInfoComplete(missing: PetInfoMissingFields): boolean {
  return !Object.values(missing).some(Boolean);
}
