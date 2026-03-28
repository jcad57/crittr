import {
  PET_TYPE_STEP_INDEX,
  useOnboardingStore,
} from "@/stores/onboardingStore";
import { useRouter } from "expo-router";

/**
 * Back from pet-type: exit add-pet flow (reset + router.back) or go to profile (onboarding).
 */
export function usePetFlowExitOnBack() {
  const router = useRouter();
  const petFlowMode = useOnboardingStore((s) => s.petFlowMode);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const reset = useOnboardingStore((s) => s.reset);

  return () => {
    if (petFlowMode === "add-pet" && currentStep === PET_TYPE_STEP_INDEX) {
      reset();
      router.back();
      return;
    }
    prevStep();
  };
}
