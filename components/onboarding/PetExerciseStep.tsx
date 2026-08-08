import PetEnergyLevelToggle from "@/components/onboarding/petInfo/PetEnergyLevelToggle";
import { petCareStyles as styles } from "@/components/onboarding/petCareStyles";
import ExercisePlanEditorModal from "@/components/pet/ExercisePlanEditorModal";
import ExercisePlansSection from "@/components/pet/ExercisePlansSection";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { getExerciseActivityIcon } from "@/constants/activityTypeProgressIcons";
import { authOnboardingStyles } from "@/constants/authOnboardingStyles";
import { shouldShowExerciseField } from "@/constants/petInfo";
import { useOnboardingStore } from "@/stores/onboardingStore";
import type { ExercisePlanFormEntry } from "@/types/database";
import {
  defaultExercisePlanDraft,
  type ExercisePlanDraft,
} from "@/utils/exercisePlans";
import {
  PET_DETAILS_STEP_INDEX,
  PET_FOOD_STEP_INDEX,
  PET_LITTER_MAINTENANCE_STEP_INDEX,
  shouldShowFirstCatLitterOnboardingStep,
} from "@/utils/onboardingPetFlow";
import { dateToPgTime, pgTimeToDate } from "@/utils/petFoodTime";
import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useShallow } from "zustand/react/shallow";

function formEntriesToDrafts(
  entries: ExercisePlanFormEntry[],
): ExercisePlanDraft[] {
  return entries.map((e) => ({
    key: e.localId,
    label: e.label,
    daysOfWeek: [...e.daysOfWeek],
    scheduledTime: pgTimeToDate(e.scheduledTimePg),
    notes: e.notes,
  }));
}

function draftsToFormEntries(
  drafts: ExercisePlanDraft[],
): ExercisePlanFormEntry[] {
  return drafts.map((d) => ({
    localId: d.key,
    label: d.label.trim(),
    daysOfWeek: [...d.daysOfWeek].sort((a, b) => a - b),
    scheduledTimePg: dateToPgTime(d.scheduledTime),
    notes: d.notes.trim(),
  }));
}

export default function PetExerciseStep() {
  const {
    pets,
    currentPetIndex,
    updateCurrentPet,
    goToStep,
    petFlowMode,
  } = useOnboardingStore(
    useShallow((s) => ({
      pets: s.pets,
      currentPetIndex: s.currentPetIndex,
      updateCurrentPet: s.updateCurrentPet,
      goToStep: s.goToStep,
      petFlowMode: s.petFlowMode,
    })),
  );
  const pet = pets[currentPetIndex];
  const showActivities = shouldShowExerciseField(pet.petType);
  const [attempted, setAttempted] = useState(false);
  const [energyLevel, setEnergyLevel] = useState(pet.energyLevel);
  const [plans, setPlans] = useState<ExercisePlanDraft[]>(() =>
    formEntriesToDrafts(pet.exercisePlans ?? []),
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("Add activity");
  const [editorDraft, setEditorDraft] = useState<ExercisePlanDraft | null>(
    null,
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    setEnergyLevel(pet.energyLevel);
    setPlans(formEntriesToDrafts(pet.exercisePlans ?? []));
  }, [pet.clientRequestId, currentPetIndex]);

  const energyOk =
    energyLevel === "low" ||
    energyLevel === "medium" ||
    energyLevel === "high";
  const activitiesOk = !showActivities || plans.length >= 1;
  const isValid = energyOk && activitiesOk;

  const energyError = attempted && !energyOk;
  const activitiesError = attempted && showActivities && plans.length < 1;

  const continueHint = useMemo(() => {
    if (!attempted || isValid) return null;
    if (!energyOk) return "Select an energy level.";
    if (showActivities && plans.length < 1)
      return "Add at least one activity for the schedule.";
    return null;
  }, [attempted, isValid, energyOk, showActivities, plans.length]);

  const openAdd = () => {
    setModalTitle("Add activity");
    setEditingIndex(null);
    setEditorDraft(defaultExercisePlanDraft());
    setModalVisible(true);
  };

  const openEdit = (index: number) => {
    const row = plans[index];
    if (!row) return;
    setModalTitle("Edit activity");
    setEditingIndex(index);
    setEditorDraft({
      ...row,
      daysOfWeek: [...row.daysOfWeek],
      scheduledTime: new Date(row.scheduledTime.getTime()),
    });
    setModalVisible(true);
  };

  const removePlan = (index: number) => {
    setPlans((rows) => rows.filter((_, i) => i !== index));
  };

  const saveFromModal = (draft: ExercisePlanDraft) => {
    if (editingIndex !== null) {
      setPlans((rows) =>
        rows.map((r, i) => (i === editingIndex ? draft : r)),
      );
    } else {
      setPlans((rows) => [...rows, draft]);
    }
    setModalVisible(false);
    setEditingIndex(null);
    setEditorDraft(null);
  };

  const persistAndGo = useCallback(
    (nextStepIndex: number) => {
      const entries = draftsToFormEntries(plans);
      updateCurrentPet({
        energyLevel: energyOk ? energyLevel : "",
        exercisePlans: entries,
        exercisesPerDay: showActivities ? String(entries.length) : "",
      });
      goToStep(nextStepIndex);
    },
    [plans, energyOk, energyLevel, showActivities, updateCurrentPet, goToStep],
  );

  const handleContinue = useCallback(() => {
    if (!isValid) {
      setAttempted(true);
      return;
    }
    persistAndGo(PET_FOOD_STEP_INDEX);
  }, [isValid, persistAndGo]);

  const handleBack = useCallback(() => {
    const entries = draftsToFormEntries(plans);
    updateCurrentPet({
      energyLevel: energyOk ? energyLevel : pet.energyLevel,
      exercisePlans: entries,
      exercisesPerDay: showActivities ? String(entries.length) : "",
    });
    if (
      shouldShowFirstCatLitterOnboardingStep(
        petFlowMode,
        currentPetIndex,
        pet.petType,
      )
    ) {
      goToStep(PET_LITTER_MAINTENANCE_STEP_INDEX);
    } else {
      goToStep(PET_DETAILS_STEP_INDEX);
    }
  }, [
    plans,
    energyOk,
    energyLevel,
    pet.energyLevel,
    showActivities,
    updateCurrentPet,
    petFlowMode,
    currentPetIndex,
    pet.petType,
    goToStep,
  ]);

  return (
    <View style={styles.container}>
      <View>
        <Text style={[authOnboardingStyles.screenTitle, { marginBottom: 12 }]}>
          Exercise requirements
        </Text>

        <View style={styles.iconCenter}>
          <Image
            source={getExerciseActivityIcon(pet.petType)}
            style={{ width: 40, height: 40 }}
            contentFit="contain"
          />
        </View>

        <Text style={styles.helperText}>
          Set {pet.name || "your pet"}&apos;s energy level
          {showActivities
            ? " and the activities you do together — we&apos;ll add them to the schedule on the days you choose."
            : "."}
        </Text>

        <PetEnergyLevelToggle
          energyLevel={energyLevel}
          onChange={(level) => setEnergyLevel(level)}
          error={energyError}
        />

        {showActivities ? (
          <ExercisePlansSection
            plans={plans}
            onAdd={openAdd}
            onEdit={openEdit}
            onRemove={removePlan}
            addButtonError={activitiesError}
            helperText="Add walks, play sessions, and more. Each activity needs a label, days, and time."
          />
        ) : (
          <Text style={styles.helperText}>
            Scheduled activities aren&apos;t tracked for this species.
          </Text>
        )}
      </View>

      <View style={styles.spacer} />

      <View>
        {continueHint != null ? (
          <Text style={styles.errorHint}>{continueHint}</Text>
        ) : null}

        <OrangeButton onPress={handleContinue} style={styles.cta}>
          Continue
        </OrangeButton>

        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={authOnboardingStyles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ExercisePlanEditorModal
        visible={modalVisible}
        title={modalTitle}
        initial={editorDraft}
        onClose={() => {
          setModalVisible(false);
          setEditingIndex(null);
          setEditorDraft(null);
        }}
        onSave={saveFromModal}
      />
    </View>
  );
}
