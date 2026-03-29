import DropdownSelect from "@/components/onboarding/DropdownSelect";
import ExpiryDateField from "@/components/onboarding/ExpiryDateField";
import FormInput from "@/components/onboarding/FormInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import Divider from "@/components/ui/Divider";
import ReminderTimePickerSheet from "@/components/ui/ReminderTimePickerSheet";
import { Colors } from "@/constants/colors";
import { formatReminderTimeHHmm } from "@/lib/medicationSchedule";
import { useOnboardingStore } from "@/stores/onboardingStore";
import type {
  FoodFormEntry,
  MedicationDosePeriod,
  MedicationFormEntry,
  VaccinationFormEntry,
} from "@/types/database";
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
  const [medDosesPerDay, setMedDosesPerDay] = useState("1");
  const [medNotes, setMedNotes] = useState("");
  const [medReminderDate, setMedReminderDate] = useState(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [medShowTimePicker, setMedShowTimePicker] = useState(false);

  // Vaccination form (optional)
  const [vacName, setVacName] = useState("");
  const [vacFrequencyLabel, setVacFrequencyLabel] = useState("");
  const [vacExpiresOn, setVacExpiresOn] = useState("");
  const [vacNotes, setVacNotes] = useState("");

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
    const dosePeriod: MedicationDosePeriod | "" =
      medFreq === "Daily"
        ? "day"
        : medFreq === "Weekly"
          ? "week"
          : medFreq === "Monthly"
            ? "month"
            : "";
    const dosesPerPeriodStr =
      medFreq === "Daily"
        ? medDosesPerDay.trim() || "1"
        : medFreq === "Weekly" || medFreq === "Monthly"
          ? "1"
          : "";
    const entry: MedicationFormEntry = {
      localId: Date.now().toString(),
      name: medName.trim(),
      dosageAmount: medDosageAmt,
      dosageType: medDosageType,
      frequency: medFreq,
      customFrequency: medFreq === "Custom" ? medCustomFreq : "",
      condition: medCondition,
      dosesPerPeriod: dosesPerPeriodStr,
      dosePeriod,
      reminderTime: formatReminderTimeHHmm(medReminderDate),
      notes: medNotes.trim(),
    };
    updateCurrentPet({ medications: [...pet.medications, entry] });
    setMedName("");
    setMedDosageAmt("");
    setMedDosageType("");
    setMedFreq("");
    setMedCustomFreq("");
    setMedCondition("");
    setMedDosesPerDay("1");
    setMedNotes("");
    const reset = new Date();
    reset.setHours(9, 0, 0, 0);
    setMedReminderDate(reset);
  };

  const removeMed = (localId: string) => {
    updateCurrentPet({
      medications: pet.medications.filter((m) => m.localId !== localId),
    });
  };

  const addVaccination = () => {
    if (!vacName.trim()) return;
    const entry: VaccinationFormEntry = {
      localId: Date.now().toString(),
      name: vacName.trim(),
      frequencyLabel: vacFrequencyLabel.trim(),
      expiresOn: vacExpiresOn.trim(),
      notes: vacNotes.trim(),
    };
    updateCurrentPet({ vaccinations: [...pet.vaccinations, entry] });
    setVacName("");
    setVacFrequencyLabel("");
    setVacExpiresOn("");
    setVacNotes("");
  };

  const removeVac = (localId: string) => {
    updateCurrentPet({
      vaccinations: pet.vaccinations.filter((v) => v.localId !== localId),
    });
  };

  const formatVacSummary = (v: VaccinationFormEntry) => {
    const parts: string[] = [];
    if (v.frequencyLabel.trim()) parts.push(v.frequencyLabel.trim());
    if (v.expiresOn.trim()) {
      const d = new Date(`${v.expiresOn}T12:00:00`);
      parts.push(
        `Exp. ${d.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        })}`,
      );
    }
    return parts.length ? parts.join(" · ") : "No expiry on file";
  };

  const formatMedSummary = (m: MedicationFormEntry) => {
    const dosage = [m.dosageAmount, m.dosageType].filter(Boolean).join(" ");
    const freq =
      m.frequency === "Custom" && m.customFrequency
        ? m.customFrequency
        : m.frequency;
    const scheduleParts: string[] = [];
    if (m.dosePeriod === "day" && m.dosesPerPeriod?.trim()) {
      scheduleParts.push(`${m.dosesPerPeriod.trim()}×/day`);
    } else if (m.dosePeriod === "week") {
      scheduleParts.push("weekly");
    } else if (m.dosePeriod === "month") {
      scheduleParts.push("monthly");
    }
    if (m.reminderTime?.trim()) {
      scheduleParts.push(m.reminderTime.trim());
    }
    return [dosage, freq, ...scheduleParts].filter(Boolean).join(" · ");
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

      {medFreq === "Daily" ? (
        <>
          <Text style={styles.fieldLabel}>Doses per day</Text>
          <FormInput
            placeholder="e.g. 2"
            value={medDosesPerDay}
            onChangeText={setMedDosesPerDay}
            keyboardType="numeric"
            containerStyle={styles.inputSpacing}
          />
        </>
      ) : null}

      <Text style={styles.fieldLabel}>Reminder time</Text>
      <Pressable
        style={styles.reminderTimeBtn}
        onPress={() => setMedShowTimePicker(true)}
      >
        <MaterialCommunityIcons
          name="clock-outline"
          size={20}
          color={Colors.orange}
        />
        <Text style={styles.reminderTimeText}>
          {formatReminderTimeHHmm(medReminderDate)}
        </Text>
      </Pressable>
      <ReminderTimePickerSheet
        visible={medShowTimePicker}
        value={medReminderDate}
        onChange={setMedReminderDate}
        onClose={() => setMedShowTimePicker(false)}
      />

      <FormInput
        placeholder="Notes"
        value={medNotes}
        onChangeText={setMedNotes}
        multiline
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

      <Divider />

      <Text style={styles.sectionTitle}>Vaccinations</Text>
      <Text style={styles.helperText}>
        Optional — add shots on file so we can remind you before they expire
      </Text>

      <FormInput
        placeholder="Vaccine name (e.g. Rabies, DHPP)"
        value={vacName}
        onChangeText={setVacName}
        containerStyle={styles.inputSpacing}
      />
      <FormInput
        placeholder="Schedule (e.g. Annual, 3-year)"
        value={vacFrequencyLabel}
        onChangeText={setVacFrequencyLabel}
        containerStyle={styles.inputSpacing}
      />
      <Text style={styles.fieldLabel}>Next expiry</Text>
      <ExpiryDateField
        value={vacExpiresOn}
        onChangeDate={setVacExpiresOn}
        onClearDate={() => setVacExpiresOn("")}
      />
      <FormInput
        placeholder="Notes"
        value={vacNotes}
        onChangeText={setVacNotes}
        multiline
        containerStyle={styles.inputSpacing}
      />
      <Pressable style={styles.addButton} onPress={addVaccination}>
        <Text style={styles.addButtonText}>+ Add this vaccination</Text>
      </Pressable>

      {pet.vaccinations.length > 0 && (
        <View style={styles.listCard}>
          {pet.vaccinations.map((v) => (
            <View key={v.localId} style={styles.listRow}>
              <View style={styles.listRowText}>
                <Text style={styles.listItemBold}>{v.name}</Text>
                <Text style={styles.listItemSub}>{formatVacSummary(v)}</Text>
              </View>
              <TouchableOpacity onPress={() => removeVac(v.localId)}>
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
  reminderTimeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
    marginBottom: 12,
  },
  reminderTimeText: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 15,
    color: Colors.textPrimary,
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
