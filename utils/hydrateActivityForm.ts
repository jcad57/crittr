import { PORTION_UNITS } from "@/constants/petFoodFormConstants";
import {
  FOOD_ACTIVITY_OTHER_ID,
  type ExerciseFormData,
  type FoodActivityFormData,
  type MaintenanceActivityFormData,
  type MedicationActivityFormData,
  type PetActivity,
  type PottyActivityFormData,
  type TrainingActivityFormData,
  type VetVisitActivityFormData,
} from "@/types/database";

const EXERCISE_TYPES = [
  "Walk",
  "Run",
  "Dog Park",
  "Home Playtime",
  "Other",
] as const;

function normalizeFoodUnit(u: string | null | undefined): string {
  if (!u) return "Cups";
  const t = u.trim();
  const lower = t.toLowerCase();
  if (lower === "cups" || lower === "cup") return "Cups";
  if (
    lower === "ounces" ||
    lower === "ounce" ||
    lower === "oz" ||
    lower === "ounce(s)"
  )
    return "Ounces";
  if (lower.includes("piece")) return "Piece(s)";
  if (PORTION_UNITS.includes(t as (typeof PORTION_UNITS)[number])) return t;
  return "Cups";
}

export function petActivityToExerciseForm(a: PetActivity): ExerciseFormData {
  const raw = a.exercise_type?.trim() ?? "";
  let exerciseType = "";
  let customExerciseType = "";
  if (
    EXERCISE_TYPES.includes(raw as (typeof EXERCISE_TYPES)[number])
  ) {
    exerciseType = raw;
    customExerciseType = "";
  } else if (raw) {
    exerciseType = "Other";
    customExerciseType = raw;
  }
  return {
    label: a.label ?? "",
    exerciseType,
    customExerciseType,
    durationHours:
      a.duration_hours != null ? String(a.duration_hours) : "",
    durationMinutes:
      a.duration_minutes != null ? String(a.duration_minutes) : "",
    distanceMiles:
      a.distance_miles != null ? String(a.distance_miles) : "",
    location: a.location ?? "",
    notes: a.notes ?? "",
  };
}

export function petActivityToFoodForm(a: PetActivity): FoodActivityFormData {
  const isTreat = a.is_treat ?? false;
  const hasFoodId = !!a.food_id?.trim();
  if (hasFoodId) {
    return {
      label: a.label ?? "",
      isTreat,
      foodId: a.food_id!,
      foodBrand: "",
      amount: a.food_amount != null ? String(a.food_amount) : "",
      unit: normalizeFoodUnit(a.food_unit),
      notes: a.notes ?? "",
    };
  }
  return {
    label: a.label ?? "",
    isTreat,
    foodId: FOOD_ACTIVITY_OTHER_ID,
    foodBrand: a.food_custom_name?.trim() ?? "",
    amount: a.food_amount != null ? String(a.food_amount) : "",
    unit: normalizeFoodUnit(a.food_unit),
    notes: a.notes ?? "",
  };
}

export function petActivityToMedicationForm(
  a: PetActivity,
): MedicationActivityFormData {
  return {
    medicationId: a.medication_id ?? "",
    medicationName: a.label ?? "",
    amount: a.med_amount != null ? String(a.med_amount) : "",
    unit: a.med_unit ?? "",
    notes: a.notes ?? "",
  };
}

export function petActivityToTrainingForm(
  a: PetActivity,
): TrainingActivityFormData {
  return {
    label: a.label ?? "",
    location: a.location ?? "",
    durationMinutes:
      a.duration_minutes != null ? String(a.duration_minutes) : "",
    notes: a.notes ?? "",
  };
}

export function petActivityToPottyForm(a: PetActivity): PottyActivityFormData {
  return {
    pee: a.potty_pee === true,
    poo: a.potty_poo === true,
    location: a.location ?? "",
    notes: a.notes ?? "",
  };
}

export function petActivityToMaintenanceForm(
  a: PetActivity,
): MaintenanceActivityFormData {
  return {
    label: a.label?.trim() ? (a.label ?? "") : "Litter box cleaning",
    notes: a.notes ?? "",
  };
}

export function petActivityToVetVisitForm(
  a: PetActivity,
  primaryVetClinic: string | null | undefined,
): VetVisitActivityFormData {
  const loc = a.vet_location?.trim() ?? "";
  const clinic = primaryVetClinic?.trim() ?? "";
  if (clinic && loc === clinic) {
    return {
      label: a.label,
      vetLocation: clinic,
      customVetLocation: "",
      otherPetIds: [...(a.other_pet_ids ?? [])],
      notes: a.notes ?? "",
    };
  }
  return {
    label: a.label,
    vetLocation: "Other",
    customVetLocation: loc,
    otherPetIds: [...(a.other_pet_ids ?? [])],
    notes: a.notes ?? "",
  };
}
