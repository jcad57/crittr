import DropdownSelect from "@/components/onboarding/DropdownSelect";
import FormInput from "@/components/onboarding/FormInput";
import Divider from "@/components/ui/Divider";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { useOnboardingStore } from "@/stores/onboardingStore";
import type { FoodFormEntry, MedicationFormEntry } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const PORTION_UNITS = ["Cups", "Ounces", "Piece(s)"] as const;
const TIMES_QUICK = ["1", "2", "3", "4", "5", "6", "7", "8"];
const DOSAGE_TYPES = [
  "Tablet",
  "Injection",
  "Liquid",
  "Topical",
  "Chewable",
  "Other",
];
const FREQ_OPTIONS = ["Daily", "Weekly", "Monthly", "Custom"];

export default function PetCareStep() {
  const { pets, currentPetIndex, updateCurrentPet, nextStep, prevStep } =
    useOnboardingStore();
  const pet = pets[currentPetIndex];
  const [attempted, setAttempted] = useState(false);

  // Food form local state
  const [foodBrand, setFoodBrand] = useState("");
  const [foodPortion, setFoodPortion] = useState("");
  const [foodUnit, setFoodUnit] = useState<string>("Cups");
  const [foodIsTreat, setFoodIsTreat] = useState(false);
  const [foodTimesPerDay, setFoodTimesPerDay] = useState("");
  const [foodNotes, setFoodNotes] = useState("");

  // Medication form local state
  const [medName, setMedName] = useState("");
  const [medDosageAmt, setMedDosageAmt] = useState("");
  const [medDosageType, setMedDosageType] = useState("");
  const [medFreq, setMedFreq] = useState("");
  const [medCustomFreq, setMedCustomFreq] = useState("");
  const [medCondition, setMedCondition] = useState("");

  const isValid = pet.foods.length > 0;

  const handleContinue = useCallback(() => {
    if (!isValid) {
      setAttempted(true);
      return;
    }
    nextStep();
  }, [isValid, nextStep]);

  const addFood = () => {
    const times = parseInt(foodTimesPerDay.trim(), 10);
    if (!foodBrand.trim() || !Number.isFinite(times) || times < 1) return;
    const entry: FoodFormEntry = {
      localId: Date.now().toString(),
      brand: foodBrand.trim(),
      portionSize: foodPortion,
      portionUnit: foodUnit,
      mealsPerDay: String(times),
      isTreat: foodIsTreat,
      notes: foodNotes.trim(),
    };
    updateCurrentPet({ foods: [...pet.foods, entry] });
    setFoodBrand("");
    setFoodPortion("");
    setFoodUnit("Cups");
    setFoodIsTreat(false);
    setFoodTimesPerDay("");
    setFoodNotes("");
  };

  const removeFood = (localId: string) => {
    updateCurrentPet({
      foods: pet.foods.filter((f) => f.localId !== localId),
    });
  };

  const addMedication = () => {
    if (!medName.trim()) return;
    const entry: MedicationFormEntry = {
      localId: Date.now().toString(),
      name: medName.trim(),
      dosageAmount: medDosageAmt,
      dosageType: medDosageType,
      frequency: medFreq,
      customFrequency: medFreq === "Custom" ? medCustomFreq : "",
      condition: medCondition,
    };
    updateCurrentPet({ medications: [...pet.medications, entry] });
    setMedName("");
    setMedDosageAmt("");
    setMedDosageType("");
    setMedFreq("");
    setMedCustomFreq("");
    setMedCondition("");
  };

  const removeMed = (localId: string) => {
    updateCurrentPet({
      medications: pet.medications.filter((m) => m.localId !== localId),
    });
  };

  const formatMedSummary = (m: MedicationFormEntry) => {
    const dosage = [m.dosageAmount, m.dosageType].filter(Boolean).join(" ");
    const freq =
      m.frequency === "Custom" && m.customFrequency
        ? m.customFrequency
        : m.frequency;
    return [dosage, freq].filter(Boolean).join(" · ");
  };

  return (
    <View style={styles.container}>
      {/* ── Food ─────────────────────────────────────────────── */}
      <Text style={styles.title}>
        What do you feed {pet.name || "your pet"}?
      </Text>

      <View style={styles.iconCenter}>
        <MaterialCommunityIcons
          name="food-drumstick"
          size={40}
          color={Colors.gray800}
        />
      </View>

      <View style={styles.foodSection}>
        <Text
          style={[
            styles.sectionTitle,
            attempted && !isValid && styles.sectionTitleError,
          ]}
        >
          Meals & Treats Per Day *
        </Text>

        <View style={styles.foodNameRow}>
          <View style={styles.foodNameField}>
            <FormInput
              placeholder="Purina, Blue, etc."
              value={foodBrand}
              onChangeText={setFoodBrand}
              containerStyle={styles.foodNameInput}
            />
          </View>
          <View style={styles.mealTreatToggleRow}>
            <Pressable
              style={[
                styles.mealTreatToggle,
                styles.mealTreatToggleBorder,
                !foodIsTreat && styles.portionToggleActive,
              ]}
              onPress={() => setFoodIsTreat(false)}
            >
              <Text
                style={[
                  styles.mealTreatToggleText,
                  !foodIsTreat && styles.portionToggleTextActive,
                ]}
              >
                Meal
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.mealTreatToggle,
                foodIsTreat && styles.portionToggleActive,
              ]}
              onPress={() => setFoodIsTreat(true)}
            >
              <Text
                style={[
                  styles.mealTreatToggleText,
                  foodIsTreat && styles.portionToggleTextActive,
                ]}
              >
                Treat
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.row3}>
          <FormInput
            placeholder="Amt"
            value={foodPortion}
            onChangeText={setFoodPortion}
            keyboardType="numeric"
            containerStyle={styles.smallInput}
          />
          <View style={styles.portionToggleRow}>
            {PORTION_UNITS.map((unit, i) => (
              <Pressable
                key={unit}
                style={[
                  styles.portionToggle,
                  i < PORTION_UNITS.length - 1 && styles.portionToggleBorder,
                  foodUnit === unit && styles.portionToggleActive,
                ]}
                onPress={() => setFoodUnit(unit)}
              >
                <Text
                  style={[
                    styles.portionToggleText,
                    foodUnit === unit && styles.portionToggleTextActive,
                  ]}
                >
                  {unit}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={styles.fieldLabel}>How many times per day?</Text>
        <View style={[styles.row3, styles.timesRow]}>
          <DropdownSelect
            placeholder="Quick select"
            value={TIMES_QUICK.includes(foodTimesPerDay) ? foodTimesPerDay : ""}
            options={TIMES_QUICK}
            onSelect={(v) => setFoodTimesPerDay(v)}
            containerStyle={styles.timesDropdown}
          />
        </View>

        <FormInput
          label="Notes"
          placeholder="e.g. 2 cups in the morning, 1 cup at night"
          value={foodNotes}
          onChangeText={setFoodNotes}
          multiline
          containerStyle={styles.notesField}
          style={styles.notesMultiline}
        />

        <Pressable style={styles.addButton} onPress={addFood}>
          <Text style={styles.addButtonText}>+ Add this food</Text>
        </Pressable>

        {pet.foods.length > 0 && (
          <View style={styles.listCard}>
            {pet.foods.map((f) => (
              <View key={f.localId} style={styles.listRow}>
                <View style={styles.listRowText}>
                  <Text style={styles.listItemBold}>{f.brand}</Text>
                  <Text style={styles.listItemSub}>
                    {f.isTreat ? "Treat" : "Meal"} · {f.portionSize}{" "}
                    {f.portionUnit} · {f.mealsPerDay}x daily
                  </Text>
                  {f.notes.trim() ? (
                    <Text style={styles.listItemNotes} numberOfLines={3}>
                      {f.notes.trim()}
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity onPress={() => removeFood(f.localId)}>
                  <MaterialCommunityIcons
                    name="close-circle"
                    size={20}
                    color={Colors.gray400}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      <Divider />

      {/* ── Medications ──────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Medications</Text>
      <Text style={styles.helperText}>
        List medications your pet is currently on here
      </Text>

      <FormInput
        placeholder="Medication name"
        value={medName}
        onChangeText={setMedName}
        containerStyle={styles.inputSpacing}
      />

      {/* Dosage: amount + type dropdown */}
      <Text style={styles.fieldLabel}>Dosage</Text>
      <View style={[styles.row3, { zIndex: 60 }]}>
        <FormInput
          placeholder="Amt"
          value={medDosageAmt}
          onChangeText={setMedDosageAmt}
          keyboardType="numeric"
          containerStyle={styles.smallInput}
        />
        <DropdownSelect
          placeholder="Select type"
          value={medDosageType}
          options={DOSAGE_TYPES}
          onSelect={setMedDosageType}
          containerStyle={{ flex: 1 }}
        />
      </View>

      {/* Frequency: dropdown only, with custom fallback */}
      <Text style={styles.fieldLabel}>Frequency</Text>
      <View style={{ zIndex: 55 }}>
        <DropdownSelect
          placeholder="Select frequency"
          value={medFreq}
          options={FREQ_OPTIONS}
          onSelect={setMedFreq}
          containerStyle={styles.inputSpacing}
        />
      </View>
      {medFreq === "Custom" && (
        <FormInput
          placeholder="Enter custom frequency"
          value={medCustomFreq}
          onChangeText={setMedCustomFreq}
          containerStyle={styles.inputSpacing}
        />
      )}

      <FormInput
        placeholder="Condition (e.g. Allergies)"
        value={medCondition}
        onChangeText={setMedCondition}
        containerStyle={styles.inputSpacing}
      />

      <Pressable style={styles.addButton} onPress={addMedication}>
        <Text style={styles.addButtonText}>+ Add this medication</Text>
      </Pressable>

      {pet.medications.length > 0 && (
        <View style={styles.listCard}>
          {pet.medications.map((m) => (
            <View key={m.localId} style={styles.listRow}>
              <View style={styles.listRowText}>
                <Text style={styles.listItemBold}>{m.name}</Text>
                <Text style={styles.listItemSub}>{formatMedSummary(m)}</Text>
              </View>
              <TouchableOpacity onPress={() => removeMed(m.localId)}>
                <MaterialCommunityIcons
                  name="close-circle"
                  size={20}
                  color={Colors.gray400}
                />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View style={styles.spacer} />

      {attempted && !isValid && (
        <Text style={styles.errorHint}>Add at least one food to continue</Text>
      )}

      <OrangeButton onPress={handleContinue} style={styles.cta}>
        Continue
      </OrangeButton>

      <TouchableOpacity onPress={prevStep} style={styles.backButton}>
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 24,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 12,
  },
  iconCenter: {
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  sectionTitleError: {
    color: Colors.error,
  },
  fieldLabel: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  helperText: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
    marginTop: -8,
  },
  inputSpacing: {
    marginBottom: 12,
  },
  foodSection: {
    zIndex: 120,
    marginBottom: 4,
  },
  foodNameRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  foodNameField: {
    flex: 1,
    minWidth: 0,
  },
  foodNameInput: {
    marginBottom: 0,
  },
  mealTreatToggleRow: {
    flexDirection: "row",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.gray200,
    height: 50,
    width: 140,
    flexShrink: 0,
  },
  mealTreatToggle: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mealTreatToggleBorder: {
    borderRightWidth: 1,
    borderRightColor: Colors.gray200,
  },
  mealTreatToggleText: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  timesRow: {
    zIndex: 80,
  },
  timesDropdown: {
    flex: 1,
    minWidth: 0,
  },
  timesNumberInput: {
    width: 88,
    marginBottom: 0,
  },
  notesField: {
    marginBottom: 12,
    minHeight: 100,
  },
  notesMultiline: {
    minHeight: 72,
  },
  row3: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  smallInput: {
    width: 70,
  },

  /* ── Food portion toggle ─────────────────────────────── */
  portionToggleRow: {
    flexDirection: "row",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.gray200,
    height: 50,
    flex: 1,
  },
  portionToggle: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  portionToggleBorder: {
    borderRightWidth: 1,
    borderRightColor: Colors.gray200,
  },
  portionToggleActive: {
    backgroundColor: Colors.orangeLight,
  },
  portionToggleText: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  portionToggleTextActive: {
    fontFamily: "InstrumentSans-Bold",
    color: Colors.orange,
  },

  /* ── Shared list styles ──────────────────────────────── */
  listCard: {
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginTop: 12,
    marginBottom: 12,
  },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listRowText: {
    flex: 1,
  },
  listItemBold: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  listItemSub: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  listItemNotes: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 15,
  },
  addButton: {
    borderWidth: 1,
    borderColor: Colors.gray500,
    borderRadius: 50,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 15,
    color: Colors.textPrimary,
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
  cta: {
    marginTop: 12,
  },
  errorHint: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 13,
    color: Colors.error,
    textAlign: "center",
    marginBottom: 8,
  },
  backButton: {
    alignSelf: "center",
    paddingVertical: 16,
  },
  backText: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 15,
    color: Colors.textSecondary,
  },
});
