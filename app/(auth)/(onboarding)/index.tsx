import FinishStep from "@/components/onboarding/FinishStep";
import OnboardingCard from "@/components/onboarding/OnboardingCard";
import PetCareStep from "@/components/onboarding/PetCareStep";
import PetInfoStep from "@/components/onboarding/PetInfoStep";
import PetTypeStep from "@/components/onboarding/PetTypeStep";
import ProfileStep from "@/components/onboarding/ProfileStep";
import SignUpStep from "@/components/onboarding/SignUpStep";
import StepIndicator from "@/components/onboarding/StepIndicator";
import { ONBOARDING_STEPS, useOnboardingStore } from "@/stores/onboardingStore";

const STEP_COMPONENTS = [
  SignUpStep,
  ProfileStep,
  PetTypeStep,
  PetInfoStep,
  PetCareStep,
  FinishStep,
];

export default function Onboarding() {
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const StepComponent = STEP_COMPONENTS[currentStep] ?? SignUpStep;

  return (
    <OnboardingCard scrollKey={currentStep}>
      <StepIndicator
        totalSteps={ONBOARDING_STEPS.length}
        currentStep={currentStep}
      />
      <StepComponent />
    </OnboardingCard>
  );
}
