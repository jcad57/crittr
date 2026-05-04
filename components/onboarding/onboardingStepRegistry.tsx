import FinishStep from "@/components/onboarding/FinishStep";
import PendingInvitesStep from "@/components/onboarding/PendingInvitesStep";
import PetDetailsStep from "@/components/onboarding/PetDetailsStep";
import PetFoodStep from "@/components/onboarding/PetFoodStep";
import PetHealthRecordsStep from "@/components/onboarding/PetHealthRecordsStep";
import PetLitterMaintenanceStep from "@/components/onboarding/PetLitterMaintenanceStep";
import PetMedicationsStep from "@/components/onboarding/PetMedicationsStep";
import PetTypeStep from "@/components/onboarding/PetTypeStep";
import PetVaccinationsStep from "@/components/onboarding/PetVaccinationsStep";
import PetVetClinicStep from "@/components/onboarding/PetVetClinicStep";
import ProfileStep from "@/components/onboarding/ProfileStep";
import SignUpStep from "@/components/onboarding/SignUpStep";
import VerifyEmailStep from "@/components/onboarding/VerifyEmailStep";
import { ONBOARDING_STEPS } from "@/stores/onboardingStore";

/**
 * Step components in the same order as `ONBOARDING_STEPS`.
 * Index with `currentStep` from the onboarding store.
 */
export const ONBOARDING_STEP_COMPONENTS = [
  SignUpStep,
  VerifyEmailStep,
  ProfileStep,
  PendingInvitesStep,
  PetTypeStep,
  PetDetailsStep,
  PetLitterMaintenanceStep,
  PetFoodStep,
  PetVetClinicStep,
  PetHealthRecordsStep,
  PetMedicationsStep,
  PetVaccinationsStep,
  FinishStep,
] as const;

if (ONBOARDING_STEP_COMPONENTS.length !== ONBOARDING_STEPS.length) {
  throw new Error(
    `ONBOARDING_STEP_COMPONENTS length ${ONBOARDING_STEP_COMPONENTS.length} does not match ONBOARDING_STEPS length ${ONBOARDING_STEPS.length}`,
  );
}
