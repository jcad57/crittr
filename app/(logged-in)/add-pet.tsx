import { ONBOARDING_STEP_COMPONENTS } from "@/components/onboarding/onboardingStepRegistry";
import OnboardingCard from "@/components/onboarding/OnboardingCard";
import StepIndicator from "@/components/onboarding/StepIndicator";
import { Colors } from "@/constants/colors";
import {
  FINISH_STEP_INDEX,
  ONBOARDING_STEPS,
  PET_TYPE_STEP_INDEX,
  useOnboardingStore,
} from "@/stores/onboardingStore";
import { useRouter } from "expo-router";
import { useEffect, useLayoutEffect } from "react";
import { ActivityIndicator, BackHandler, StyleSheet, View } from "react-native";

const ADD_PET_STEP_COUNT = FINISH_STEP_INDEX - PET_TYPE_STEP_INDEX + 1;

export default function AddPetScreen() {
  const router = useRouter();
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const petFlowMode = useOnboardingStore((s) => s.petFlowMode);
  const reset = useOnboardingStore((s) => s.reset);

  /** Run once on mount only. Using getState() avoids effect re-running if the store
   * action reference changes between renders (which would cause an update loop). */
  useLayoutEffect(() => {
    useOnboardingStore.getState().startAddPetFlow();
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      const state = useOnboardingStore.getState();
      if (state.petFlowMode !== "add-pet") return false;
      if (state.currentStep === PET_TYPE_STEP_INDEX) {
        reset();
        router.back();
        return true;
      }
      state.prevStep();
      return true;
    });
    return () => sub.remove();
  }, [reset, router]);

  useEffect(() => {
    return () => {
      if (useOnboardingStore.getState().petFlowMode === "add-pet") {
        useOnboardingStore.getState().reset();
      }
    };
  }, []);

  const ready =
    petFlowMode === "add-pet" &&
    currentStep >= PET_TYPE_STEP_INDEX &&
    currentStep <= FINISH_STEP_INDEX;

  const stepOffset = currentStep - PET_TYPE_STEP_INDEX;
  const StepComponent =
    ONBOARDING_STEP_COMPONENTS[currentStep] ?? ONBOARDING_STEP_COMPONENTS[PET_TYPE_STEP_INDEX];

  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  return (
    <OnboardingCard
      scrollKey={currentStep}
      scrollBody={currentStep !== FINISH_STEP_INDEX}
      header={
        <StepIndicator
          totalSteps={ADD_PET_STEP_COUNT}
          currentStep={stepOffset}
        />
      }
    >
      <StepComponent />
    </OnboardingCard>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
});
