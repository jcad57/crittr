import DropdownSelect from "@/components/onboarding/DropdownSelect";
import FormInput from "@/components/onboarding/FormInput";
import OptInStep from "@/components/onboarding/OptInStep";
import { petCareStyles as styles } from "@/components/onboarding/petCareStyles";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import ReminderTimePickerSheet from "@/components/ui/ReminderTimePickerSheet";
import { authOnboardingStyles } from "@/constants/authOnboardingStyles";
import { Colors } from "@/constants/colors";
import { formatReminderTimeHHmm } from "@/lib/medicationSchedule";
import { useOnboardingStore } from "@/stores/onboardingStore";
import type {
  MedicationDosePeriod,
  MedicationFormEntry,
} from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
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
  const { pets, currentPetIndex, updateCurrentPet, nextStep, prevStep } =
    useOnboardingStore();
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
        ? "1"
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

  const formatMedSummary = (m: MedicationFormEntry) => {
    const dosage = [m.dosageAmount, m.dosageType].filter(Boolean).join(" ");
    const freq =
      m.frequency === "Custom" && m.customFrequency
        ? m.customFrequency
        : m.frequency;
    const scheduleParts: string[] = [];
    if (m.dosePeriod === "day") {
      const n = parseInt(m.dosesPerPeriod?.trim() ?? "1", 10);
      if (Number.isFinite(n) && n > 1) {
        scheduleParts.push(`${n}×/day`);
      } else {
        scheduleParts.push("daily");
      }
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
    <View style={styles.container}>
      <Text style={[authOnboardingStyles.screenTitle, { marginBottom: 12 }]}>
        Medications for {name}
      </Text>
      <Text style={styles.helperText}>
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

      <View style={styles.spacer} />

      <OrangeButton onPress={nextStep} style={styles.cta}>
        Continue
      </OrangeButton>

      <TouchableOpacity onPress={() => setPhase("prompt")} style={styles.backButton}>
        <Text style={authOnboardingStyles.backText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}
