import AuthBackToWelcome from "@/components/onboarding/AuthBackToWelcome";
import OnboardingCard from "@/components/onboarding/OnboardingCard";
import { ONBOARDING_STEP_COMPONENTS } from "@/components/onboarding/onboardingStepRegistry";
import StepIndicator from "@/components/onboarding/StepIndicator";
import { useAuthStore } from "@/stores/authStore";
import {
  FINISH_STEP_INDEX,
  ONBOARDING_INDICATED_STEP_COUNT,
  useOnboardingStore,
} from "@/stores/onboardingStore";
import { useEffect } from "react";

/**
 * Resume onboarding at the correct step for returning sessions.
 * Only jumps from step 0 so we never skip ahead of an in-progress signup (step > 0).
 */
export default function Onboarding() {
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const goToStep = useOnboardingStore((s) => s.goToStep);
  const resetOnboarding = useOnboardingStore((s) => s.reset);
  const session = useAuthStore((s) => s.session);
  const needsOnboarding = useAuthStore((s) => s.needsOnboarding);
  const resumeStep = useAuthStore((s) => s.onboardingResumeStep);

  useEffect(() => {
    if (!session || !needsOnboarding || resumeStep == null) return;
    const step = useOnboardingStore.getState().currentStep;
    if (step !== 0) return;
    goToStep(resumeStep);
  }, [session?.user.id, needsOnboarding, resumeStep, goToStep]);

  const StepComponent =
    ONBOARDING_STEP_COMPONENTS[currentStep] ?? ONBOARDING_STEP_COMPONENTS[0];

  const showIndicator = currentStep > 0;
  const indicatorIndex = currentStep - 1;

  return (
    <OnboardingCard
      scrollKey={currentStep}
      scrollBody={currentStep !== FINISH_STEP_INDEX}
      header={
        currentStep === 0 ? (
          <AuthBackToWelcome onBeforeNavigate={resetOnboarding} />
        ) : showIndicator ? (
          <StepIndicator
            totalSteps={ONBOARDING_INDICATED_STEP_COUNT}
            currentStep={indicatorIndex}
          />
        ) : undefined
      }
    >
      <StepComponent />
    </OnboardingCard>
  );
}
