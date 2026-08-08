import FormInput from "@/components/onboarding/FormInput";
import { petCareStyles as styles } from "@/components/onboarding/petCareStyles";
import PetFoodMealScheduleSection from "@/components/onboarding/petFood/PetFoodMealScheduleSection";
import PetFoodTypeToggle from "@/components/onboarding/petFood/PetFoodTypeToggle";
import MealPortionEditorModal from "@/components/pet/MealPortionEditorModal";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { getMealsActivityIcon } from "@/constants/activityTypeProgressIcons";
import { authOnboardingStyles } from "@/constants/authOnboardingStyles";
import { foodBrandInputPlaceholder } from "@/constants/petFoodFormConstants";
import { useOnboardingStore } from "@/stores/onboardingStore";
import {
  PET_EXERCISE_STEP_INDEX,
} from "@/utils/onboardingPetFlow";
import type { FoodFormEntry } from "@/types/database";
import {
  deriveMealPortionsFromLegacyFields,
  type MealPortionDraft,
} from "@/utils/petFood";
import { dateToPgTime, pgTimeToDate } from "@/utils/petFoodTime";
import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useShallow } from "zustand/react/shallow";

const TREAT_DEFAULT_UNIT = "Piece(s)";
const MEAL_DEFAULT_UNIT = "Cups";

export default function PetFoodStep() {
  const {
    pets,
    currentPetIndex,
    updateCurrentPet,
    nextStep,
    goToStep,
  } = useOnboardingStore(
    useShallow((s) => ({
      pets: s.pets,
      currentPetIndex: s.currentPetIndex,
      updateCurrentPet: s.updateCurrentPet,
      nextStep: s.nextStep,
      goToStep: s.goToStep,
    })),
  );
  const pet = pets[currentPetIndex];
  const [attempted, setAttempted] = useState(false);

  const handleBackFromFood = useCallback(() => {
    goToStep(PET_EXERCISE_STEP_INDEX);
  }, [goToStep]);

  const [foodBrand, setFoodBrand] = useState("");
  const [foodIsTreat, setFoodIsTreat] = useState(false);
  const [foodNotes, setFoodNotes] = useState("");

  /** Scheduled portions (meals and treats). */
  const [mealPortions, setMealPortions] = useState<MealPortionDraft[]>([]);
  const [portionModalVisible, setPortionModalVisible] = useState(false);
  const [portionModalTitle, setPortionModalTitle] = useState("Add a portion");
  const [portionEditorDraft, setPortionEditorDraft] =
    useState<MealPortionDraft | null>(null);
  const [editingPortionIndex, setEditingPortionIndex] = useState<number | null>(
    null,
  );

  useEffect(() => {
    const f = pet.foods[0];
    if (!f) {
      setFoodBrand("");
      setFoodIsTreat(false);
      setFoodNotes("");
      setMealPortions([]);
      return;
    }
    setFoodBrand(f.brand);
    setFoodNotes(f.notes);
    setFoodIsTreat(f.isTreat);
    if (f.mealPortions?.length) {
      setMealPortions(
        f.mealPortions.map((p) => ({
          key: p.key,
          portionSize: p.portionSize,
          portionUnit: p.portionUnit,
          feedTime: pgTimeToDate(p.feedTimePg),
        })),
      );
    } else if (f.portionSize.trim() || f.mealsPerDay.trim()) {
      setMealPortions(
        deriveMealPortionsFromLegacyFields({
          mealsPerDayStr: f.mealsPerDay,
          portionSize: f.portionSize,
          portionUnit: f.portionUnit,
          defaultUnit: f.isTreat ? TREAT_DEFAULT_UNIT : MEAL_DEFAULT_UNIT,
        }),
      );
    } else {
      setMealPortions([]);
    }
  }, [pet.foods[0]?.localId, currentPetIndex]);

  const isValid = useMemo(() => {
    if (!foodBrand.trim()) return false;
    if (mealPortions.length < 1) return false;
    return mealPortions.every((p) => p.portionSize.trim().length > 0);
  }, [foodBrand, mealPortions]);

  const showFieldErrors = attempted && !isValid;
  const brandErr = attempted && !foodBrand.trim();

  const mealNeedsFirstPortion = attempted && mealPortions.length < 1;
  const mealPortionAmountMissing =
    attempted &&
    mealPortions.length > 0 &&
    mealPortions.some((p) => !p.portionSize.trim());
  const feedingScheduleLabelError =
    mealPortionAmountMissing && !mealNeedsFirstPortion;

  const continueBlockedHint = useMemo(() => {
    if (!showFieldErrors) return null;
    if (!foodBrand.trim()) return "Enter a food brand.";
    if (mealNeedsFirstPortion)
      return "Add at least one feeding portion using Add a portion below.";
    if (mealPortionAmountMissing)
      return "Enter an amount for each feeding portion — tap a row to edit it.";
    return "Finish the missing fields above.";
  }, [
    showFieldErrors,
    foodBrand,
    mealNeedsFirstPortion,
    mealPortionAmountMissing,
  ]);

  const defaultPortionUnit = foodIsTreat ? TREAT_DEFAULT_UNIT : MEAL_DEFAULT_UNIT;

  const openAddPortion = () => {
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    setPortionModalTitle("Add a portion");
    setEditingPortionIndex(null);
    setPortionEditorDraft({
      key: `new-${Date.now()}`,
      portionSize: "",
      portionUnit: defaultPortionUnit,
      feedTime: d,
    });
    setPortionModalVisible(true);
  };

  const openEditPortion = (index: number) => {
    const row = mealPortions[index];
    if (!row) return;
    setPortionModalTitle("Edit portion");
    setEditingPortionIndex(index);
    setPortionEditorDraft({
      ...row,
      feedTime: new Date(row.feedTime.getTime()),
    });
    setPortionModalVisible(true);
  };

  const removePortion = (index: number) => {
    setMealPortions((rows) => rows.filter((_, i) => i !== index));
  };

  const savePortionFromModal = (draft: MealPortionDraft) => {
    if (editingPortionIndex !== null) {
      setMealPortions((rows) =>
        rows.map((r, i) => (i === editingPortionIndex ? draft : r)),
      );
    } else {
      setMealPortions((rows) => [...rows, draft]);
    }
    setPortionModalVisible(false);
    setEditingPortionIndex(null);
    setPortionEditorDraft(null);
  };

  const handleContinue = useCallback(() => {
    if (!isValid) {
      setAttempted(true);
      return;
    }
    const localId = pet.foods[0]?.localId ?? Date.now().toString();
    const entry: FoodFormEntry = {
      localId,
      brand: foodBrand.trim(),
      portionSize: "",
      portionUnit: defaultPortionUnit,
      mealsPerDay: String(mealPortions.length),
      isTreat: foodIsTreat,
      notes: foodNotes.trim(),
      mealPortions: mealPortions.map((p) => ({
        key: p.key,
        portionSize: p.portionSize.trim(),
        portionUnit: p.portionUnit,
        feedTimePg: dateToPgTime(p.feedTime),
      })),
    };
    updateCurrentPet({ foods: [entry] });
    nextStep();
  }, [
    isValid,
    nextStep,
    pet.foods[0]?.localId,
    foodBrand,
    foodIsTreat,
    foodNotes,
    mealPortions,
    defaultPortionUnit,
    updateCurrentPet,
  ]);

  return (
    <View style={styles.container}>
      {/*
        Do not nest ScrollView here: OnboardingCard already scrolls. Nested
        scroll views break Pressable taps (edit/delete portion buttons).
      */}
      <View>
        <Text style={[authOnboardingStyles.screenTitle, { marginBottom: 12 }]}>
          What do you feed {pet.name || "your pet"}?
        </Text>

        <View style={styles.iconCenter}>
          <Image
            source={getMealsActivityIcon(pet.petType)}
            style={{ width: 40, height: 40 }}
            contentFit="contain"
          />
        </View>

        <View style={styles.foodSection}>
          <Text style={styles.sectionTitle}>Meals & treats *</Text>
          <Text style={styles.helperText}>
            Add your first meal or treat. Add each feeding time and portion
            below — we&apos;ll use those times on the schedule.
          </Text>

          <FormInput
            label="Food brand"
            required
            placeholder={foodBrandInputPlaceholder(pet.petType || null)}
            value={foodBrand}
            onChangeText={setFoodBrand}
            containerStyle={styles.inputSpacing}
            error={brandErr}
          />

          <PetFoodTypeToggle
            isTreat={foodIsTreat}
            onSelectMeal={() => setFoodIsTreat(false)}
            onSelectTreat={() => setFoodIsTreat(true)}
          />

          <PetFoodMealScheduleSection
            mealPortions={mealPortions}
            petName={pet.name}
            onAddPortion={openAddPortion}
            onEditPortion={openEditPortion}
            onRemovePortion={removePortion}
            feedingScheduleLabelError={feedingScheduleLabelError}
            addPortionButtonError={mealNeedsFirstPortion}
            portionRowAmountMissing={(idx) =>
              attempted && !mealPortions[idx]?.portionSize.trim()
            }
          />

          <FormInput
            label="Notes"
            placeholder="Any feeding notes"
            value={foodNotes}
            onChangeText={setFoodNotes}
            multiline
            containerStyle={styles.notesField}
            style={styles.notesMultiline}
          />
        </View>

        {continueBlockedHint != null ? (
          <Text style={styles.errorHint}>{continueBlockedHint}</Text>
        ) : null}

        <OrangeButton onPress={handleContinue} style={styles.cta}>
          Continue
        </OrangeButton>

        <TouchableOpacity onPress={handleBackFromFood} style={styles.backButton}>
          <Text style={authOnboardingStyles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <MealPortionEditorModal
        visible={portionModalVisible}
        title={portionModalTitle}
        initial={portionEditorDraft}
        onClose={() => {
          setPortionModalVisible(false);
          setEditingPortionIndex(null);
          setPortionEditorDraft(null);
        }}
        onSave={savePortionFromModal}
      />
    </View>
  );
}
