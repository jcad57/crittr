import ExpiryDateField from "@/components/onboarding/ExpiryDateField";
import FormInput from "@/components/onboarding/FormInput";
import OptInStep from "@/components/onboarding/OptInStep";
import { petCareStyles as onboardingStyles } from "@/components/onboarding/petCareStyles";
import PetMedicationDosageRow from "@/components/petScreens/medication/PetMedicationDosageRow";
import PetMedicationFrequencySection from "@/components/petScreens/medication/PetMedicationFrequencySection";
import PetMedicationReminderField from "@/components/petScreens/medication/PetMedicationReminderField";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { authOnboardingStyles } from "@/constants/authOnboardingStyles";
import type { SchedulePeriod } from "@/constants/medicationEditForm";
import { useOnboardingStore } from "@/stores/onboardingStore";
import type {
  MedicationDosePeriod,
  MedicationFormEntry,
  MedicationSchedulePeriod,
} from "@/types/database";
import { buildMedicationSavePayload } from "@/utils/medicationEditForm";
import { sortTimesAscUnique } from "@/utils/medicationReminderTimes";
import {
  formatReminderTimeHHmm,
  parseReminderTimeHHmm,
} from "@/utils/medicationSchedule";
import { useShallow } from "zustand/react/shallow";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { styles as medStyles } from "@/screen-styles/pet/[id]/medications/[medicationId].styles";

type LegacyMedicationShape = MedicationFormEntry & {
  frequency?: string;
  reminderTime?: string;
  dosePeriod?: MedicationDosePeriod | "";
};

function scheduleFromLegacy(m: LegacyMedicationShape): MedicationSchedulePeriod {
  if (m.schedulePeriod) return m.schedulePeriod;
  switch (m.frequency) {
    case "Weekly":
      return "week";
    case "Monthly":
      return "month";
    case "Custom":
      return "custom";
    default:
      return "day";
  }
}

function reminderDatesFromEntry(m: LegacyMedicationShape): Date[] {
  if (m.reminderTimes?.length) {
    return m.reminderTimes.map((t) => parseReminderTimeHHmm(t));
  }
  return [parseReminderTimeHHmm(m.reminderTime)];
}

export default function PetMedicationsStep() {
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
  const [dosageAmount, setDosageAmount] = useState("");
  const [dosageType, setDosageType] = useState("");
  const [dosesPerPeriod, setDosesPerPeriod] = useState("1");
  const [schedulePeriod, setSchedulePeriod] = useState<SchedulePeriod>("day");
  const [customIntervalCount, setCustomIntervalCount] = useState("1");
  const [customIntervalUnit, setCustomIntervalUnit] =
    useState<MedicationDosePeriod>("month");
  const [condition, setCondition] = useState("");
  const [notes, setNotes] = useState("");
  const [reminderDates, setReminderDates] = useState<Date[]>(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return [d];
  });
  const [lastGivenOn, setLastGivenOn] = useState("");
  const [validationAttempted, setValidationAttempted] = useState(false);

  useEffect(() => {
    const raw = pet.medications[0];
    if (!raw) {
      setMedName("");
      setDosageAmount("");
      setDosageType("");
      setDosesPerPeriod("1");
      setSchedulePeriod("day");
      setCustomIntervalCount("1");
      setCustomIntervalUnit("month");
      setCondition("");
      setNotes("");
      const reset = new Date();
      reset.setHours(9, 0, 0, 0);
      setReminderDates([reset]);
      setLastGivenOn("");
      setValidationAttempted(false);
      return;
    }
    const m = raw as LegacyMedicationShape;
    setMedName(m.name);
    setDosageAmount(m.dosageAmount);
    setDosageType(m.dosageType);
    setDosesPerPeriod(m.dosesPerPeriod?.trim() ? m.dosesPerPeriod : "1");
    setSchedulePeriod(scheduleFromLegacy(m));
    setCustomIntervalCount(m.customIntervalCount?.trim() ? m.customIntervalCount : "1");
    setCustomIntervalUnit(
      m.customIntervalUnit === "day" ||
        m.customIntervalUnit === "week" ||
        m.customIntervalUnit === "month"
        ? m.customIntervalUnit
        : "month",
    );
    setCondition(m.condition);
    setNotes(m.notes);
    setReminderDates(reminderDatesFromEntry(m));
    setLastGivenOn(m.lastGivenOn?.trim() ?? "");
    setValidationAttempted(false);
  }, [pet.medications[0]?.localId, currentPetIndex]);

  const parsedDoses = parseInt(dosesPerPeriod.trim(), 10);
  const parsedCustomInterval = parseInt(customIntervalCount.trim(), 10);
  const nameError = validationAttempted && !medName.trim();
  const dosageAmountError = validationAttempted && !dosageAmount.trim();
  const dosageTypeError = validationAttempted && !dosageType.trim();
  const dosePeriodStd =
    schedulePeriod === "custom"
      ? null
      : (schedulePeriod as MedicationDosePeriod);
  const doseCountError =
    validationAttempted &&
    dosePeriodStd === "day" &&
    (!Number.isFinite(parsedDoses) || parsedDoses < 1);
  const doseCountErrorWeekMonth =
    validationAttempted &&
    (dosePeriodStd === "week" || dosePeriodStd === "month") &&
    dosesPerPeriod.trim() !== "" &&
    (!Number.isFinite(parsedDoses) || parsedDoses < 1);
  const customIntervalError =
    validationAttempted &&
    schedulePeriod === "custom" &&
    (!Number.isFinite(parsedCustomInterval) || parsedCustomInterval < 1);

  const buildMedicationEntry = useCallback((): MedicationFormEntry => {
    const reminderTimes = sortTimesAscUnique(
      reminderDates.map((d) => formatReminderTimeHHmm(d)),
    );
    return {
      localId: pet.medications[0]?.localId ?? Date.now().toString(),
      name: medName.trim(),
      dosageAmount,
      dosageType,
      dosesPerPeriod,
      schedulePeriod,
      customIntervalCount,
      customIntervalUnit,
      condition,
      notes,
      reminderTimes,
      lastGivenOn,
    };
  }, [
    pet.medications[0]?.localId,
    medName,
    dosageAmount,
    dosageType,
    dosesPerPeriod,
    schedulePeriod,
    customIntervalCount,
    customIntervalUnit,
    condition,
    notes,
    reminderDates,
    lastGivenOn,
  ]);

  const handleContinue = useCallback(() => {
    setValidationAttempted(true);
    if (!medName.trim()) return;
    if (!dosageAmount.trim() || !dosageType.trim()) return;

    const payload = buildMedicationSavePayload({
      name: medName,
      dosageAmount,
      dosageType,
      dosesPerPeriod,
      schedulePeriod,
      customIntervalCount,
      customIntervalUnit,
      condition,
      notes,
      reminderDates,
      lastGivenOn,
    });
    if (!payload) return;

    updateCurrentPet({ medications: [buildMedicationEntry()] });
    nextStep();
  }, [
    medName,
    dosageAmount,
    dosageType,
    dosesPerPeriod,
    schedulePeriod,
    customIntervalCount,
    customIntervalUnit,
    condition,
    notes,
    reminderDates,
    lastGivenOn,
    buildMedicationEntry,
    updateCurrentPet,
    nextStep,
  ]);

  const showErrorHint = useMemo(
    () =>
      validationAttempted &&
      (nameError ||
        dosageAmountError ||
        dosageTypeError ||
        doseCountError ||
        doseCountErrorWeekMonth ||
        customIntervalError),
    [
      validationAttempted,
      nameError,
      dosageAmountError,
      dosageTypeError,
      doseCountError,
      doseCountErrorWeekMonth,
      customIntervalError,
    ],
  );

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
    <View style={onboardingStyles.formContainer}>
      <Text style={authOnboardingStyles.screenTitleForm}>
        Medications for {name}
      </Text>
      <Text style={authOnboardingStyles.formHelperText}>
        List medications your pet is currently on here
      </Text>

      <FormInput
        label="Name"
        required
        placeholder="Medication name"
        value={medName}
        onChangeText={setMedName}
        containerStyle={medStyles.field}
        error={nameError}
      />

      <PetMedicationDosageRow
        dosageAmount={dosageAmount}
        setDosageAmount={setDosageAmount}
        dosageType={dosageType}
        setDosageType={setDosageType}
        dosageAmountError={dosageAmountError}
        dosageTypeError={dosageTypeError}
      />

      <PetMedicationFrequencySection
        schedulePeriod={schedulePeriod}
        setSchedulePeriod={setSchedulePeriod}
        dosesPerPeriod={dosesPerPeriod}
        setDosesPerPeriod={setDosesPerPeriod}
        customIntervalCount={customIntervalCount}
        setCustomIntervalCount={setCustomIntervalCount}
        customIntervalUnit={customIntervalUnit}
        setCustomIntervalUnit={setCustomIntervalUnit}
        parsedCustomInterval={parsedCustomInterval}
        doseCountError={doseCountError}
        doseCountErrorWeekMonth={doseCountErrorWeekMonth}
        customIntervalError={customIntervalError}
      />

      <PetMedicationReminderField
        reminderDates={reminderDates}
        setReminderDates={setReminderDates}
      />

      <Text style={medStyles.fieldLabel}>Last given</Text>
      <View style={medStyles.lastGivenWrap}>
        <ExpiryDateField
          value={lastGivenOn}
          onChangeDate={setLastGivenOn}
          onClearDate={() => setLastGivenOn("")}
          placeholder="Select date"
        />
      </View>

      <FormInput
        label="Condition"
        placeholder="e.g. Allergies"
        value={condition}
        onChangeText={setCondition}
        containerStyle={medStyles.field}
      />

      <FormInput
        label="Notes"
        placeholder="Notes"
        value={notes}
        onChangeText={setNotes}
        multiline
        containerStyle={medStyles.field}
      />

      {showErrorHint ? (
        <Text style={medStyles.formErrorHint}>
          Please fill in the required fields above.
        </Text>
      ) : null}

      <View style={onboardingStyles.spacer} />

      <OrangeButton onPress={handleContinue} style={onboardingStyles.cta}>
        Continue
      </OrangeButton>

      <TouchableOpacity onPress={() => setPhase("prompt")} style={onboardingStyles.backButton}>
        <Text style={authOnboardingStyles.backText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}
