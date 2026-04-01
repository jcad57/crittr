import FinishStep from "@/components/onboarding/FinishStep";
import OnboardingCard from "@/components/onboarding/OnboardingCard";
import PendingInvitesStep from "@/components/onboarding/PendingInvitesStep";
import PetCareStep from "@/components/onboarding/PetCareStep";
import PetInfoStep from "@/components/onboarding/PetInfoStep";
import PetTypeStep from "@/components/onboarding/PetTypeStep";
import ProfileStep from "@/components/onboarding/ProfileStep";
import SignUpStep from "@/components/onboarding/SignUpStep";
import StepIndicator from "@/components/onboarding/StepIndicator";
import { useAuthStore } from "@/stores/authStore";
import { ONBOARDING_STEPS, useOnboardingStore } from "@/stores/onboardingStore";
import { useEffect } from "react";

const STEP_COMPONENTS = [
  SignUpStep,
  ProfileStep,
  PendingInvitesStep,
  PetTypeStep,
  PetInfoStep,
  PetCareStep,
  FinishStep,
];

/**
 * Resume onboarding at the correct step for returning sessions.
 * Only jumps from step 0 so we never skip ahead of an in-progress signup (step > 0).
 */
export default function Onboarding() {
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const goToStep = useOnboardingStore((s) => s.goToStep);
  const session = useAuthStore((s) => s.session);
  const needsOnboarding = useAuthStore((s) => s.needsOnboarding);
  const resumeStep = useAuthStore((s) => s.onboardingResumeStep);

  useEffect(() => {
    if (!session || !needsOnboarding || resumeStep == null) return;
    const step = useOnboardingStore.getState().currentStep;
    if (step !== 0) return;
    goToStep(resumeStep);
  }, [session?.user.id, needsOnboarding, resumeStep, goToStep]);

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
