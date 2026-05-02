import DropdownSelect from "@/components/onboarding/DropdownSelect";
import FormInput from "@/components/onboarding/FormInput";
import OptInStep from "@/components/onboarding/OptInStep";
import { petCareStyles as styles } from "@/components/onboarding/petCareStyles";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import ReminderTimePickerSheet from "@/components/ui/ReminderTimePickerSheet";
import { authOnboardingStyles } from "@/constants/authOnboardingStyles";
import { Colors } from "@/constants/colors";
import { useUserDateTimePrefs } from "@/hooks/useUserDateTimePrefs";
import { formatReminderTimeHHmm } from "@/utils/medicationSchedule";
import { formatUserTime } from "@/utils/userDateTimeFormat";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useShallow } from "zustand/react/shallow";
import type {
  MedicationDosePeriod,
  MedicationFormEntry,
} from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, TouchableOpacity, View } from "react-native";

const DOSAGE_TYPES = [
  "Tablet",
  "Injection",
  "Liquid",
  "Topical",
  "Chewable",
  "Other",
];
const FREQ_OPTIONS = ["Daily", "Weekly", "Monthly", "Custom"];

export default function PetMedicationsStep() {
  const { timeDisplay } = useUserDateTimePrefs();
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
  const name = pet.name?.trim() || "your pet";

  const [phase, setPhase] = useState<"prompt" | "form">(() =>
    pet.medications.length > 0 ? "form" : "prompt",
  );

  const [medName, setMedName] = useState("");
  const [medDosageAmt, setMedDosageAmt] = useState("");
  const [medDosageType, setMedDosageType] = useState("");
  const [medFreq, setMedFreq] = useState("");
  const [medCustomFreq, setMedCustomFreq] = useState("");
  const [medCondition, setMedCondition] = useState("");
  const [medNotes, setMedNotes] = useState("");
  const [medReminderDate, setMedReminderDate] = useState(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [medShowTimePicker, setMedShowTimePicker] = useState(false);

  useEffect(() => {
    const m = pet.medications[0];
    if (!m) {
      setMedName("");
      setMedDosageAmt("");
      setMedDosageType("");
      setMedFreq("");
      setMedCustomFreq("");
      setMedCondition("");
      setMedNotes("");
      const reset = new Date();
      reset.setHours(9, 0, 0, 0);
      setMedReminderDate(reset);
      return;
    }
    setMedName(m.name);
    setMedDosageAmt(m.dosageAmount);
    setMedDosageType(m.dosageType);
    setMedFreq(m.frequency);
    setMedCustomFreq(m.customFrequency || "");
    setMedCondition(m.condition);
    setMedNotes(m.notes);
    if (m.reminderTime?.trim()) {
      const parts = m.reminderTime.split(":");
      const h = parseInt(parts[0] ?? "", 10);
      const min = parseInt(parts[1] ?? "", 10);
      if (Number.isFinite(h) && Number.isFinite(min)) {
        const d = new Date();
        d.setHours(h, min, 0, 0);
        setMedReminderDate(d);
      }
    }
  }, [pet.medications[0]?.localId, currentPetIndex]);

  const buildMedicationEntry = useCallback((): MedicationFormEntry => {
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
        ? "1"
        : medFreq === "Weekly" || medFreq === "Monthly"
          ? "1"
          : "";
    return {
      localId: pet.medications[0]?.localId ?? Date.now().toString(),
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
  }, [
    pet.medications[0]?.localId,
    medName,
    medDosageAmt,
    medDosageType,
    medFreq,
    medCustomFreq,
    medCondition,
    medReminderDate,
    medNotes,
  ]);

  const handleContinue = useCallback(() => {
    if (medName.trim()) {
      updateCurrentPet({ medications: [buildMedicationEntry()] });
    } else {
      updateCurrentPet({ medications: [] });
    }
    nextStep();
  }, [medName, buildMedicationEntry, updateCurrentPet, nextStep]);

  if (phase === "prompt") {
    return (
      <OptInStep
        title={`Add medications for ${name}?`}
        subtitle="List current medications on the next screen, or skip if none."
        yesLabel="Yes, add medications"
        noLabel="Skip"
        onYes={() => setPhase("form")}
        onNo={() => nextStep()}
        onBack={prevStep}
      />
    );
  }

  return (
    <View style={styles.formContainer}>
      <Text style={authOnboardingStyles.screenTitleForm}>
        Medications for {name}
      </Text>
      <Text style={authOnboardingStyles.formHelperText}>
        List medications your pet is currently on here
      </Text>

      <FormInput
        placeholder="Medication name"
        value={medName}
        onChangeText={setMedName}
        containerStyle={styles.inputSpacing}
      />

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
          {formatUserTime(medReminderDate, timeDisplay)}
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

      <View style={styles.spacer} />

      <OrangeButton onPress={handleContinue} style={styles.cta}>
        Continue
      </OrangeButton>

      <TouchableOpacity onPress={() => setPhase("prompt")} style={styles.backButton}>
        <Text style={authOnboardingStyles.backText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}
