import AuthBackToWelcome from "@/components/onboarding/AuthBackToWelcome";
import OnboardingCard from "@/components/onboarding/OnboardingCard";
import { ONBOARDING_STEP_COMPONENTS } from "@/components/onboarding/onboardingStepRegistry";
import StepIndicator from "@/components/onboarding/StepIndicator";
import VerifyEmailBackHeader from "@/components/onboarding/VerifyEmailBackHeader";
import { useAuthStore } from "@/stores/authStore";
import {
  FINISH_STEP_INDEX,
  ONBOARDING_INDICATED_STEP_COUNT,
  PROFILE_STEP_INDEX,
  VERIFY_EMAIL_STEP_INDEX,
  useOnboardingStore,
} from "@/stores/onboardingStore";
import { Redirect } from "expo-router";
import { useEffect, useRef } from "react";

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
  const requiresCoCareRemovedScreen = useAuthStore(
    (s) => s.requiresCoCareRemovedScreen,
  );

  if (requiresCoCareRemovedScreen) {
    return <Redirect href="/(auth)/(onboarding)/co-care-removed" />;
  }

  /**
   * Self-heal "limbo zero-pet" state. A logged-in user can land here after
   * a flaky `refreshAuthSession` (`hasPets` cached as false even though the
   * pet exists in Supabase). We trigger a single fresh resolve so that if
   * the user genuinely has pets, `(auth)/_layout` flips them to the
   * dashboard. Run only once per session re-entry to avoid loops.
   */
  const selfHealedRef = useRef(false);
  useEffect(() => {
    if (!session || !needsOnboarding) {
      selfHealedRef.current = false;
      return;
    }
    if (selfHealedRef.current) return;
    selfHealedRef.current = true;
    void useAuthStore.getState().refreshAuthSession().catch(() => {
      /* non-fatal */
    });
  }, [session, needsOnboarding]);

  useEffect(() => {
    if (!session || !needsOnboarding || resumeStep == null) return;
    const step = useOnboardingStore.getState().currentStep;
    if (step !== 0) return;
    goToStep(resumeStep);
  }, [session?.user.id, needsOnboarding, resumeStep, goToStep]);

  /** If session exists, do not show verify-email (OTP already completed or stale step). */
  useEffect(() => {
    if (!session) return;
    if (currentStep !== VERIFY_EMAIL_STEP_INDEX) return;
    goToStep(PROFILE_STEP_INDEX);
  }, [session, currentStep, goToStep]);

  const StepComponent =
    ONBOARDING_STEP_COMPONENTS[currentStep] ?? ONBOARDING_STEP_COMPONENTS[0];

  const showIndicator = currentStep >= PROFILE_STEP_INDEX;

  return (
    <OnboardingCard
      scrollKey={currentStep}
      scrollBody={currentStep !== FINISH_STEP_INDEX}
      centerContent={currentStep === 0}
      header={
        currentStep === 0 ? (
          <AuthBackToWelcome onBeforeNavigate={resetOnboarding} />
        ) : currentStep === VERIFY_EMAIL_STEP_INDEX ? (
          <VerifyEmailBackHeader />
        ) : showIndicator ? (
          <StepIndicator
            totalSteps={ONBOARDING_INDICATED_STEP_COUNT}
            currentStep={currentStep - PROFILE_STEP_INDEX}
          />
        ) : undefined
      }
    >
      <StepComponent />
    </OnboardingCard>
  );
}
