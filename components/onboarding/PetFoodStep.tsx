import FormInput from "@/components/onboarding/FormInput";
import { petCareStyles as styles } from "@/components/onboarding/petCareStyles";
import PetFoodMealScheduleSection from "@/components/onboarding/petFood/PetFoodMealScheduleSection";
import PetFoodTreatSection from "@/components/onboarding/petFood/PetFoodTreatSection";
import PetFoodTypeToggle from "@/components/onboarding/petFood/PetFoodTypeToggle";
import MealPortionEditorModal from "@/components/pet/MealPortionEditorModal";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { authOnboardingStyles } from "@/constants/authOnboardingStyles";
import { TIMES_QUICK } from "@/constants/petFoodFormConstants";
import {
  deriveMealPortionsFromLegacyFields,
  type MealPortionDraft,
} from "@/utils/petFood";
import { dateToPgTime, pgTimeToDate } from "@/utils/petFoodTime";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useShallow } from "zustand/react/shallow";
import type { FoodFormEntry } from "@/types/database";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

export default function PetFoodStep() {
  const { pets, currentPetIndex, updateCurrentPet, nextStep, prevStep } =
    useOnboardingStore(
      useShallow((s) => ({
        pets: s.pets,
        currentPetIndex: s.currentPetIndex,
        updateCurrentPet: s.updateCurrentPet,
        nextStep: s.nextStep,
        prevStep: s.prevStep,
      })),
    );
  const pet = pets[currentPetIndex];
  const [attempted, setAttempted] = useState(false);

  const [foodBrand, setFoodBrand] = useState("");
  const [foodIsTreat, setFoodIsTreat] = useState(false);
  const [foodNotes, setFoodNotes] = useState("");

  /** Treat: single portion + times per day */
  const [treatPortionSize, setTreatPortionSize] = useState("");
  const [treatPortionUnit, setTreatPortionUnit] = useState<string>("Cups");
  const [treatTimesPerDay, setTreatTimesPerDay] = useState("1");

  /** Meal: scheduled portions */
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
      setTreatPortionSize("");
      setTreatPortionUnit("Cups");
      setTreatTimesPerDay("1");
      setMealPortions([]);
      return;
    }
    setFoodBrand(f.brand);
    setFoodNotes(f.notes);
    setFoodIsTreat(f.isTreat);
    if (f.isTreat) {
      setTreatPortionSize(f.portionSize);
      setTreatPortionUnit(f.portionUnit || "Cups");
      const n = parseInt(f.mealsPerDay.trim(), 10);
      setTreatTimesPerDay(
        Number.isFinite(n) && n >= 1 && n <= 8 ? String(n) : "1",
      );
      setMealPortions([]);
    } else {
      if (f.mealPortions?.length) {
        setMealPortions(
          f.mealPortions.map((p) => ({
            key: p.key,
            portionSize: p.portionSize,
            portionUnit: p.portionUnit,
            feedTime: pgTimeToDate(p.feedTimePg),
          })),
        );
      } else {
        setMealPortions(
          deriveMealPortionsFromLegacyFields({
            mealsPerDayStr: f.mealsPerDay,
            portionSize: f.portionSize,
            portionUnit: f.portionUnit,
          }),
        );
      }
    }
  }, [pet.foods[0]?.localId, currentPetIndex]);

  const isValid = useMemo(() => {
    if (!foodBrand.trim()) return false;
    if (foodIsTreat) {
      const t = parseInt(treatTimesPerDay.trim(), 10);
      return (
        Number.isFinite(t) &&
        t >= 1 &&
        t <= 8 &&
        TIMES_QUICK.includes(treatTimesPerDay)
      );
    }
    if (mealPortions.length < 1) return false;
    return mealPortions.every((p) => p.portionSize.trim().length > 0);
  }, [foodBrand, foodIsTreat, treatTimesPerDay, mealPortions]);

  const showFieldErrors = attempted && !isValid;
  const brandErr = showFieldErrors && !foodBrand.trim();
  const treatTimesErr =
    showFieldErrors &&
    foodIsTreat &&
    (!treatTimesPerDay.trim() || !TIMES_QUICK.includes(treatTimesPerDay));

  const openAddPortion = () => {
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    setPortionModalTitle("Add a portion");
    setEditingPortionIndex(null);
    setPortionEditorDraft({
      key: `new-${Date.now()}`,
      portionSize: "",
      portionUnit: "Cups",
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
    let entry: FoodFormEntry;
    if (foodIsTreat) {
      const times = parseInt(treatTimesPerDay.trim(), 10);
      entry = {
        localId,
        brand: foodBrand.trim(),
        portionSize: treatPortionSize,
        portionUnit: treatPortionUnit,
        mealsPerDay: String(times),
        isTreat: true,
        notes: foodNotes.trim(),
      };
    } else {
      entry = {
        localId,
        brand: foodBrand.trim(),
        portionSize: "",
        portionUnit: "Cups",
        mealsPerDay: String(mealPortions.length),
        isTreat: false,
        notes: foodNotes.trim(),
        mealPortions: mealPortions.map((p) => ({
          key: p.key,
          portionSize: p.portionSize.trim(),
          portionUnit: p.portionUnit,
          feedTimePg: dateToPgTime(p.feedTime),
        })),
      };
    }
    updateCurrentPet({ foods: [entry] });
    nextStep();
  }, [
    isValid,
    nextStep,
    pet.foods[0]?.localId,
    foodBrand,
    foodIsTreat,
    foodNotes,
    treatPortionSize,
    treatPortionUnit,
    treatTimesPerDay,
    mealPortions,
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
            source={require("@/assets/icons/food-icon.png")}
            style={{ width: 40, height: 40 }}
            resizeMode="contain"
          />
        </View>

        <View style={styles.foodSection}>
          <Text
            style={[
              styles.sectionTitle,
              showFieldErrors && styles.sectionTitleError,
            ]}
          >
            Meals & treats *
          </Text>
          <Text style={styles.helperText}>
            Add one meal or treat — same as on your pet profile. For meals, add
            each feeding time and portion; for treats, set amount and how often
            per day.
          </Text>

          <FormInput
            label="Food brand"
            required
            placeholder="e.g. Purina Pro Plan"
            value={foodBrand}
            onChangeText={setFoodBrand}
            containerStyle={styles.inputSpacing}
            error={brandErr}
          />

          <PetFoodTypeToggle
            isTreat={foodIsTreat}
            onSelectMeal={() => {
              setFoodIsTreat(false);
              setMealPortions([]);
            }}
            onSelectTreat={() => {
              setFoodIsTreat(true);
              setMealPortions([]);
              setTreatPortionSize("");
              setTreatTimesPerDay("1");
            }}
          />

          {foodIsTreat ? (
            <PetFoodTreatSection
              portionSize={treatPortionSize}
              setPortionSize={setTreatPortionSize}
              portionUnit={treatPortionUnit}
              setPortionUnit={setTreatPortionUnit}
              timesPerDay={treatTimesPerDay}
              setTimesPerDay={setTreatTimesPerDay}
              timesError={treatTimesErr}
            />
          ) : (
            <PetFoodMealScheduleSection
              mealPortions={mealPortions}
              petName={pet.name}
              onAddPortion={openAddPortion}
              onEditPortion={openEditPortion}
              onRemovePortion={removePortion}
            />
          )}

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

        {showFieldErrors && (
          <Text style={styles.errorHint}>
            {foodIsTreat
              ? "Enter a food brand and pick times per day (1–8)."
              : "Enter a brand and at least one portion with an amount."}
          </Text>
        )}

        <OrangeButton onPress={handleContinue} style={styles.cta}>
          Continue
        </OrangeButton>

        <TouchableOpacity onPress={prevStep} style={styles.backButton}>
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
