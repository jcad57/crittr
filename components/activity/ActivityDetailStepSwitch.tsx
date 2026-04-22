import type { ActivityDetailStepRef } from "@/components/activity/ActivityDetailStepRef";
import ExerciseDetailStep from "@/components/activity/ExerciseDetailStep";
import FoodDetailStep from "@/components/activity/FoodDetailStep";
import MedicationDetailStep from "@/components/activity/MedicationDetailStep";
import PottyDetailStep from "@/components/activity/PottyDetailStep";
import TrainingDetailStep from "@/components/activity/TrainingDetailStep";
import VetVisitDetailStep from "@/components/activity/VetVisitDetailStep";
import type { ActivityType } from "@/types/database";
import type { MutableRefObject } from "react";

type Props = {
  activityType: ActivityType | null;
  stepRef: MutableRefObject<ActivityDetailStepRef | null>;
  saveLabel: string;
  /** Forwarded to exercise/food/medication steps (defaults to true inside each step). */
  showBatchPets?: boolean;
  onBack: () => void;
  onSaveExercise: () => Promise<void>;
  onSaveFood: () => Promise<void>;
  onSaveMedication: () => Promise<void>;
  onSaveTraining: () => Promise<void>;
  onSavePotty: () => Promise<void>;
  /** Only supported in the edit flow — add flow never hits vet_visit. */
  onSaveVetVisit?: () => Promise<void>;
};

export default function ActivityDetailStepSwitch({
  activityType,
  stepRef,
  saveLabel,
  showBatchPets,
  onBack,
  onSaveExercise,
  onSaveFood,
  onSaveMedication,
  onSaveTraining,
  onSavePotty,
  onSaveVetVisit,
}: Props) {
  if (activityType === "exercise") {
    return (
      <ExerciseDetailStep
        ref={stepRef}
        onSave={onSaveExercise}
        onBack={onBack}
        saveLabel={saveLabel}
        embeddedInScreen
        hideEmbeddedSave
        showBatchPets={showBatchPets}
      />
    );
  }
  if (activityType === "food") {
    return (
      <FoodDetailStep
        ref={stepRef}
        onSave={onSaveFood}
        onBack={onBack}
        saveLabel={saveLabel}
        embeddedInScreen
        hideEmbeddedSave
        showBatchPets={showBatchPets}
      />
    );
  }
  if (activityType === "medication") {
    return (
      <MedicationDetailStep
        ref={stepRef}
        onSave={onSaveMedication}
        onBack={onBack}
        saveLabel={saveLabel}
        embeddedInScreen
        hideEmbeddedSave
        showBatchPets={showBatchPets}
      />
    );
  }
  if (activityType === "training") {
    return (
      <TrainingDetailStep
        ref={stepRef}
        onSave={onSaveTraining}
        onBack={onBack}
        saveLabel={saveLabel}
        embeddedInScreen
        hideEmbeddedSave
      />
    );
  }
  if (activityType === "potty") {
    return (
      <PottyDetailStep
        ref={stepRef}
        onSave={onSavePotty}
        onBack={onBack}
        saveLabel={saveLabel}
        embeddedInScreen
        hideEmbeddedSave
      />
    );
  }
  if (activityType === "vet_visit" && onSaveVetVisit) {
    return (
      <VetVisitDetailStep
        ref={stepRef}
        onSave={onSaveVetVisit}
        onBack={onBack}
        saveLabel={saveLabel}
        embeddedInScreen
        hideEmbeddedSave
      />
    );
  }
  return null;
}
