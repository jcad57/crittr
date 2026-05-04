import type { PetType } from "@/types/database";
import { type PetFlowMode, ONBOARDING_STEPS } from "@/stores/onboardingStore";

export const PET_DETAILS_STEP_INDEX = ONBOARDING_STEPS.indexOf("pet-details");
export const PET_LITTER_MAINTENANCE_STEP_INDEX = ONBOARDING_STEPS.indexOf(
  "pet-litter-maintenance",
);
export const PET_FOOD_STEP_INDEX = ONBOARDING_STEPS.indexOf("pet-food");

export function shouldShowFirstCatLitterOnboardingStep(
  petFlowMode: PetFlowMode,
  currentPetIndex: number,
  petType: PetType | "",
): boolean {
  return (
    petFlowMode === "onboarding" &&
    currentPetIndex === 0 &&
    petType === "cat"
  );
}
