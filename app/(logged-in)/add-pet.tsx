import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { useTierLimitGate } from "@/hooks/useTierLimitGate";
import { useProGateNavigation } from "@/hooks/useProGateNavigation";
import { ONBOARDING_STEP_COMPONENTS } from "@/components/onboarding/onboardingStepRegistry";
import OnboardingCard from "@/components/onboarding/OnboardingCard";
import StepIndicator from "@/components/onboarding/StepIndicator";
import { Colors } from "@/theme/colors";
import {
  FINISH_STEP_INDEX,
  PET_TYPE_STEP_INDEX,
  useOnboardingStore,
} from "@/stores/onboardingStore";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { ActivityIndicator, BackHandler, StyleSheet, Text, View } from "react-native";

const ADD_PET_STEP_COUNT = FINISH_STEP_INDEX - PET_TYPE_STEP_INDEX + 1;

export default function AddPetScreen() {
  const router = useRouter();
  const { canAddPetOrUpgrade } = useTierLimitGate();
  const { replaceWithUpgrade } = useProGateNavigation();
  const [accessChecked, setAccessChecked] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  useFocusEffect(useCallback(() => {
    let active = true;
    setAccessChecked(false);
    setCheckingAccess(true);
    void canAddPetOrUpgrade(
      () => { if (active) setAccessChecked(true); },
      () => { if (active) replaceWithUpgrade(); },
    ).finally(() => { if (active) setCheckingAccess(false); });
    return () => { active = false; };
  }, [canAddPetOrUpgrade, replaceWithUpgrade]));
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

  if (!ready || !accessChecked) {
    return (
      <View style={styles.boot}>
        {checkingAccess || !ready ? (
          <ActivityIndicator size="large" color={Colors.orange} />
        ) : (
          <>
            <Text>Connect to the internet to check your pet limit.</Text>
            <OrangeButton onPress={() => {
              setCheckingAccess(true);
              void canAddPetOrUpgrade(() => setAccessChecked(true), replaceWithUpgrade)
                .finally(() => setCheckingAccess(false));
            }}>Try again</OrangeButton>
          </>
        )}
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
