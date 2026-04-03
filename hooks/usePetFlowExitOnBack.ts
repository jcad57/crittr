import {
  PET_TYPE_STEP_INDEX,
  PROFILE_STEP_INDEX,
  useOnboardingStore,
} from "@/stores/onboardingStore";
import { useRouter } from "expo-router";
import { useCallback } from "react";

/**
 * Back from pet-type: discard in-progress “add another pet” row and return to
 * finish (`cancelAddAnotherPet`), exit add-pet flow (reset + router.back), jump
 * to profile if we auto-skipped empty pending-invites, else normal prevStep.
 */
export function usePetFlowExitOnBack() {
  const router = useRouter();
  const petFlowMode = useOnboardingStore((s) => s.petFlowMode);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const addingAnotherPet = useOnboardingStore((s) => s.addingAnotherPet);
  const skippedPendingInvitesEmpty = useOnboardingStore(
    (s) => s.skippedPendingInvitesEmpty,
  );
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const reset = useOnboardingStore((s) => s.reset);
  const goToStep = useOnboardingStore((s) => s.goToStep);
  const cancelAddAnotherPet = useOnboardingStore((s) => s.cancelAddAnotherPet);

  return useCallback(() => {
    if (
      petFlowMode === "onboarding" &&
      currentStep === PET_TYPE_STEP_INDEX &&
      addingAnotherPet
    ) {
      cancelAddAnotherPet();
      return;
    }
    if (petFlowMode === "add-pet" && currentStep === PET_TYPE_STEP_INDEX) {
      reset();
      router.back();
      return;
    }
    if (
      petFlowMode === "onboarding" &&
      currentStep === PET_TYPE_STEP_INDEX &&
      skippedPendingInvitesEmpty
    ) {
      goToStep(PROFILE_STEP_INDEX);
      return;
    }
    prevStep();
  }, [
    petFlowMode,
    currentStep,
    addingAnotherPet,
    skippedPendingInvitesEmpty,
    router,
    prevStep,
    reset,
    goToStep,
    cancelAddAnotherPet,
  ]);
}
