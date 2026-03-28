import ActivityTypeStep from "@/components/activity/ActivityTypeStep";
import ExerciseDetailStep from "@/components/activity/ExerciseDetailStep";
import FoodDetailStep from "@/components/activity/FoodDetailStep";
import MedicationDetailStep from "@/components/activity/MedicationDetailStep";
import VetVisitDetailStep from "@/components/activity/VetVisitDetailStep";
import OnboardingCard from "@/components/onboarding/OnboardingCard";
import {
  useLogExerciseMutation,
  useLogFoodMutation,
  useLogMedicationMutation,
  useLogVetVisitMutation,
} from "@/hooks/mutations/useLogActivityMutation";
import { usePetsQuery } from "@/hooks/queries";
import { useActivityFormStore } from "@/stores/activityFormStore";
import { usePetStore } from "@/stores/petStore";
import { useRouter } from "expo-router";
import { useCallback, useEffect } from "react";
import { BackHandler } from "react-native";

export default function AddActivityScreen() {
  const router = useRouter();
  const step = useActivityFormStore((s) => s.step);
  const activityType = useActivityFormStore((s) => s.activityType);
  const selectType = useActivityFormStore((s) => s.selectType);
  const setStep = useActivityFormStore((s) => s.setStep);
  const reset = useActivityFormStore((s) => s.reset);

  const exerciseForm = useActivityFormStore((s) => s.exerciseForm);
  const foodForm = useActivityFormStore((s) => s.foodForm);
  const medForm = useActivityFormStore((s) => s.medicationForm);
  const vetForm = useActivityFormStore((s) => s.vetVisitForm);

  const activePetId = usePetStore((s) => s.activePetId);
  const { data: allPets } = usePetsQuery();

  const exerciseMut = useLogExerciseMutation(activePetId);
  const foodMut = useLogFoodMutation(activePetId);
  const medMut = useLogMedicationMutation(activePetId);
  const vetMut = useLogVetVisitMutation(activePetId);

  useEffect(() => {
    reset();
    return () => reset();
  }, [reset]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (step === "details") {
        setStep("type");
        return true;
      }
      reset();
      router.back();
      return true;
    });
    return () => sub.remove();
  }, [step, setStep, reset, router]);

  const goBack = useCallback(() => {
    if (step === "details") {
      setStep("type");
    } else {
      reset();
      router.back();
    }
  }, [step, setStep, reset, router]);

  const finish = useCallback(() => {
    reset();
    router.back();
  }, [reset, router]);

  const saveExercise = useCallback(async () => {
    await exerciseMut.mutateAsync(exerciseForm);
    finish();
  }, [exerciseMut, exerciseForm, finish]);

  const saveFood = useCallback(async () => {
    await foodMut.mutateAsync(foodForm);
    finish();
  }, [foodMut, foodForm, finish]);

  const saveMed = useCallback(async () => {
    await medMut.mutateAsync(medForm);
    finish();
  }, [medMut, medForm, finish]);

  const saveVet = useCallback(async () => {
    await vetMut.mutateAsync({
      form: vetForm,
      allPetIds: (allPets ?? []).map((p) => p.id),
    });
    finish();
  }, [vetMut, vetForm, allPets, finish]);

  const scrollKey = `${step}-${activityType ?? "none"}`;

  return (
    <OnboardingCard scrollKey={scrollKey}>
      {step === "type" ? (
        <ActivityTypeStep
          selected={activityType}
          onSelect={selectType}
          onBack={goBack}
        />
      ) : activityType === "exercise" ? (
        <ExerciseDetailStep onSave={saveExercise} onBack={goBack} />
      ) : activityType === "food" ? (
        <FoodDetailStep onSave={saveFood} onBack={goBack} />
      ) : activityType === "medication" ? (
        <MedicationDetailStep onSave={saveMed} onBack={goBack} />
      ) : activityType === "vet_visit" ? (
        <VetVisitDetailStep onSave={saveVet} onBack={goBack} />
      ) : null}
    </OnboardingCard>
  );
}
