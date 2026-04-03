import FormInput from "@/components/onboarding/FormInput";
import { petCareStyles as styles } from "@/components/onboarding/petCareStyles";
import MealPortionEditorModal from "@/components/pet/MealPortionEditorModal";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { authOnboardingStyles } from "@/constants/authOnboardingStyles";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import {
  deriveMealPortionsFromLegacyFields,
  type MealPortionDraft,
} from "@/lib/petFood";
import { dateToPgTime, pgTimeToDate } from "@/lib/petFoodTime";
import { useOnboardingStore } from "@/stores/onboardingStore";
import type { FoodFormEntry } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const PORTION_UNITS = ["Cups", "Ounces", "Piece(s)"] as const;
const TIMES_QUICK = ["1", "2", "3", "4", "5", "6", "7", "8"];

export default function PetFoodStep() {
  const { pets, currentPetIndex, updateCurrentPet, nextStep, prevStep } =
    useOnboardingStore();
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

          <Text style={styles.fieldLabel}>Type</Text>
          <View style={stepStyles.typeRow}>
            <Pressable
              style={[
                stepStyles.typeToggle,
                !foodIsTreat && stepStyles.typeToggleMealActive,
              ]}
              onPress={() => {
                if (foodIsTreat) {
                  setFoodIsTreat(false);
                  setMealPortions([]);
                }
              }}
            >
              <Text
                style={[
                  stepStyles.typeToggleText,
                  !foodIsTreat && stepStyles.typeToggleTextMeal,
                ]}
              >
                Meal
              </Text>
            </Pressable>
            <Pressable
              style={[
                stepStyles.typeToggle,
                foodIsTreat && stepStyles.typeToggleTreatActive,
              ]}
              onPress={() => {
                if (!foodIsTreat) {
                  setFoodIsTreat(true);
                  setMealPortions([]);
                  setTreatPortionSize("");
                  setTreatTimesPerDay("1");
                }
              }}
            >
              <Text
                style={[
                  stepStyles.typeToggleText,
                  foodIsTreat && stepStyles.typeToggleTextTreat,
                ]}
              >
                Treat
              </Text>
            </Pressable>
          </View>

          {foodIsTreat ? (
            <>
              <Text style={styles.fieldLabel}>Portion</Text>
              <View style={stepStyles.row2}>
                <FormInput
                  placeholder="Amount"
                  value={treatPortionSize}
                  onChangeText={setTreatPortionSize}
                  keyboardType="decimal-pad"
                  containerStyle={stepStyles.portionAmt}
                />
                <View style={stepStyles.portionUnits}>
                  {PORTION_UNITS.map((unit, i) => (
                    <Pressable
                      key={unit}
                      style={[
                        stepStyles.unitChip,
                        i < PORTION_UNITS.length - 1 &&
                          stepStyles.unitChipBorder,
                        treatPortionUnit === unit && stepStyles.unitChipActive,
                      ]}
                      onPress={() => setTreatPortionUnit(unit)}
                    >
                      <Text
                        style={[
                          stepStyles.unitChipText,
                          treatPortionUnit === unit &&
                            stepStyles.unitChipTextActive,
                        ]}
                      >
                        {unit}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <Text
                style={[
                  styles.fieldLabel,
                  treatTimesErr && styles.fieldLabelError,
                ]}
              >
                Times per day *
              </Text>
              <View style={stepStyles.timesRow}>
                {TIMES_QUICK.map((t) => (
                  <Pressable
                    key={t}
                    style={[
                      stepStyles.timeChip,
                      treatTimesPerDay === t && stepStyles.timeChipActive,
                    ]}
                    onPress={() => setTreatTimesPerDay(t)}
                  >
                    <Text
                      style={[
                        stepStyles.timeChipText,
                        treatTimesPerDay === t && stepStyles.timeChipTextActive,
                      ]}
                    >
                      {t}×
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>Feeding schedule</Text>
              <Text style={stepStyles.mealHint}>
                Add multiple portions if you feed your pet multiple times a day.
                Each includes amount, unit, and the time you usually feed — Pro
                members get reminders when it's time to feed{" "}
                {pet.name || "your pet"}!
              </Text>
              {mealPortions.map((row, index) => (
                <View key={row.key} style={stepStyles.portionCard}>
                  <View style={stepStyles.portionCardMain}>
                    <Text style={stepStyles.portionCardTitle}>
                      {row.feedTime.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </Text>
                    <Text style={stepStyles.portionCardSub} numberOfLines={2}>
                      {[row.portionSize.trim(), row.portionUnit]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </Text>
                  </View>
                  <View style={stepStyles.portionCardActions}>
                    <Pressable
                      style={({ pressed }) => [
                        stepStyles.portionIconBtn,
                        pressed && stepStyles.portionIconBtnPressed,
                      ]}
                      onPress={() => openEditPortion(index)}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel="Edit portion"
                    >
                      <MaterialCommunityIcons
                        name="pencil-outline"
                        size={22}
                        color={Colors.orange}
                      />
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        stepStyles.portionIconBtn,
                        pressed && stepStyles.portionIconBtnPressed,
                      ]}
                      onPress={() => removePortion(index)}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel="Remove portion"
                    >
                      <MaterialCommunityIcons
                        name="trash-can-outline"
                        size={22}
                        color={Colors.error}
                      />
                    </Pressable>
                  </View>
                </View>
              ))}
              <Pressable
                style={({ pressed }) => [
                  stepStyles.addPortionBtn,
                  pressed && stepStyles.addPortionBtnPressed,
                ]}
                onPress={openAddPortion}
              >
                <MaterialCommunityIcons
                  name="plus-circle-outline"
                  size={22}
                  color={Colors.orange}
                />
                <Text style={stepStyles.addPortionBtnText}>Add a portion</Text>
              </Pressable>
            </>
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

const stepStyles = StyleSheet.create({
  typeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  typeToggle: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
  },
  typeToggleMealActive: {
    backgroundColor: Colors.orangeLight,
    borderColor: Colors.orange,
  },
  typeToggleTreatActive: {
    backgroundColor: "#FFF0DD",
    borderColor: "#C2410C",
  },
  typeToggleText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  typeToggleTextMeal: {
    color: Colors.orange,
  },
  typeToggleTextTreat: {
    color: "#C2410C",
  },
  row2: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
    alignItems: "stretch",
  },
  portionAmt: {
    width: 100,
    marginBottom: 0,
  },
  portionUnits: {
    flex: 1,
    flexDirection: "row",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.gray200,
    height: 50,
  },
  unitChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
  },
  unitChipBorder: {
    borderRightWidth: 1,
    borderRightColor: Colors.gray200,
  },
  unitChipActive: {
    backgroundColor: Colors.orangeLight,
  },
  unitChipText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  unitChipTextActive: {
    color: Colors.orange,
  },
  timesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  timeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  timeChipActive: {
    backgroundColor: Colors.orangeLight,
    borderColor: Colors.orange,
  },
  timeChipText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  timeChipTextActive: {
    color: Colors.orange,
  },
  mealHint: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 12,
  },
  portionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
    marginBottom: 10,
  },
  portionCardMain: {
    flex: 1,
    minWidth: 0,
  },
  portionCardTitle: {
    fontFamily: Font.uiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  portionCardSub: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  portionCardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  portionIconBtn: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  portionIconBtnPressed: {
    opacity: 0.65,
  },
  addPortionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.orange,
    backgroundColor: Colors.white,
    marginBottom: 16,
  },
  addPortionBtnPressed: {
    opacity: 0.88,
  },
  addPortionBtnText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.orange,
  },
});
