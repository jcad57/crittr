import FinishStep from "@/components/onboarding/FinishStep";
import OnboardingCard from "@/components/onboarding/OnboardingCard";
import PetCareStep from "@/components/onboarding/PetCareStep";
import PetInfoStep from "@/components/onboarding/PetInfoStep";
import PetTypeStep from "@/components/onboarding/PetTypeStep";
import StepIndicator from "@/components/onboarding/StepIndicator";
import { Colors } from "@/constants/colors";
import {
  ONBOARDING_STEPS,
  PET_TYPE_STEP_INDEX,
  useOnboardingStore,
} from "@/stores/onboardingStore";
import { useRouter } from "expo-router";
import { useEffect, useLayoutEffect } from "react";
import { ActivityIndicator, BackHandler, StyleSheet, View } from "react-native";

const FINISH_STEP_INDEX = ONBOARDING_STEPS.indexOf("finish");
const ADD_PET_STEP_COUNT = FINISH_STEP_INDEX - PET_TYPE_STEP_INDEX + 1;

const ADD_PET_STEPS = [
  PetTypeStep,
  PetInfoStep,
  PetCareStep,
  FinishStep,
] as const;

export default function AddPetScreen() {
  const router = useRouter();
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const petFlowMode = useOnboardingStore((s) => s.petFlowMode);
  const startAddPetFlow = useOnboardingStore((s) => s.startAddPetFlow);
  const reset = useOnboardingStore((s) => s.reset);

  useLayoutEffect(() => {
    startAddPetFlow();
  }, [startAddPetFlow]);

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
  const StepComponent = ADD_PET_STEPS[stepOffset] ?? PetTypeStep;

  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  return (
    <OnboardingCard scrollKey={currentStep}>
      <StepIndicator
        totalSteps={ADD_PET_STEP_COUNT}
        currentStep={stepOffset}
      />
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
