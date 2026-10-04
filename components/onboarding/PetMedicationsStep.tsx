import OptInStep from "@/components/onboarding/OptInStep";
import { petCareStyles as onboardingStyles } from "@/components/onboarding/petCareStyles";
import MedicationDosageEditorModal from "@/components/pet/MedicationDosageEditorModal";
import PetMedicationDosageScheduleSection from "@/components/petScreens/medication/PetMedicationDosageScheduleSection";
import PetMedicationFrequencySection from "@/components/petScreens/medication/PetMedicationFrequencySection";
import PetMedicationLastGivenSection from "@/components/petScreens/medication/PetMedicationLastGivenSection";
import PetMedicationNotesSection from "@/components/petScreens/medication/PetMedicationNotesSection";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import FormInput from "@/components/ui/form/FormInput";
import { authOnboardingStyles } from "@/constants/authOnboardingStyles";
import { DEFAULT_DOSAGE_TYPE } from "@/constants/medicationEditForm";
import { styles as medStyles } from "@/screen-styles/pet/[id]/medications/[medicationId].styles";
import { useOnboardingStore } from "@/stores/onboardingStore";
import type { MedicationFormEntry } from "@/types/database";
import {
  dosagesFromFormEntry,
  dosagesToFormEntries,
  isMedicationDosagesValid,
  type MedicationDosageDraft,
} from "@/utils/medicationDosageDraft";
import { createMedicationDosageHandlers } from "@/utils/medicationDosageEditor";
import { buildMedicationSavePayload } from "@/utils/medicationEditForm";
import {
  DEFAULT_FREQUENCY_DRAFT,
  dosageScheduleHint,
  frequencyDraftFromFormEntry,
  lastGivenHelperText,
  schedulePeriodFromFrequencyKind,
  type MedicationFrequencyDraft,
} from "@/utils/medicationFrequency";
import { sortTimesAscUnique } from "@/utils/medicationReminderTimes";
import { formatReminderTimeHHmm } from "@/utils/medicationSchedule";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useShallow } from "zustand/react/shallow";

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
  const [dosages, setDosages] = useState<MedicationDosageDraft[]>([]);
  const [condition, setCondition] = useState("");
  const [notes, setNotes] = useState("");
  const [lastGivenOn, setLastGivenOn] = useState("");
  const [frequency, setFrequency] = useState<MedicationFrequencyDraft>(
    DEFAULT_FREQUENCY_DRAFT,
  );
  const [validationAttempted, setValidationAttempted] = useState(false);
  const lastGivenMaxDateRef = useRef(new Date());

  const [dosageModalVisible, setDosageModalVisible] = useState(false);
  const [dosageModalTitle, setDosageModalTitle] = useState("Add dosage");
  const [dosageEditorDraft, setDosageEditorDraft] =
    useState<MedicationDosageDraft | null>(null);
  const [editingDosageIndex, setEditingDosageIndex] = useState<number | null>(
    null,
  );

  useEffect(() => {
    const raw = pet.medications[0];
    if (!raw) {
      setMedName("");
      setDosages([]);
      setCondition("");
      setNotes("");
      setLastGivenOn("");
      setFrequency(DEFAULT_FREQUENCY_DRAFT);
      setValidationAttempted(false);
      return;
    }
    setMedName(raw.name);
    setDosages(dosagesFromFormEntry(raw));
    setCondition(raw.condition);
    setNotes(raw.notes);
    setLastGivenOn(raw.lastGivenOn?.trim() ?? "");
    setFrequency(frequencyDraftFromFormEntry(raw));
    setValidationAttempted(false);
  }, [pet.medications[0]?.localId, currentPetIndex]);

  const nameError = validationAttempted && !medName.trim();
  const needsFirstDosage = validationAttempted && dosages.length < 1;
  const dosageAmountMissing =
    validationAttempted &&
    dosages.length > 0 &&
    dosages.some((d) => !d.dosageAmount.trim() || !d.dosageType.trim());
  const scheduleLabelError = dosageAmountMissing && !needsFirstDosage;

  const { openAddDosage, openEditDosage, removeDosage, saveDosageFromModal } =
    createMedicationDosageHandlers({
      dosages,
      setDosages,
      editingDosageIndex,
      setEditingDosageIndex,
      setDosageEditorDraft,
      setDosageModalVisible,
      setDosageModalTitle,
    });

  const buildMedicationEntry = useCallback((): MedicationFormEntry => {
    const reminderTimes = sortTimesAscUnique(
      dosages.map((d) => formatReminderTimeHHmm(d.reminderTime)),
    );
    const first = dosages[0];
    return {
      localId: pet.medications[0]?.localId ?? Date.now().toString(),
      name: medName.trim(),
      dosageAmount: first?.dosageAmount ?? "",
      dosageType: first?.dosageType ?? DEFAULT_DOSAGE_TYPE,
      dosesPerPeriod: String(dosages.length),
      schedulePeriod: schedulePeriodFromFrequencyKind(frequency.kind),
      customIntervalCount: String(frequency.monthInterval),
      customIntervalUnit: "month",
      condition,
      notes,
      reminderTimes,
      lastGivenOn,
      dosages: dosagesToFormEntries(dosages),
      frequencyKind: frequency.kind,
      customMonthCount: String(frequency.monthInterval),
    };
  }, [
    pet.medications[0]?.localId,
    medName,
    dosages,
    condition,
    notes,
    lastGivenOn,
    frequency,
  ]);

  const handleContinue = useCallback(() => {
    setValidationAttempted(true);
    if (!medName.trim()) return;
    if (!isMedicationDosagesValid(dosages)) return;

    const payload = buildMedicationSavePayload({
      name: medName,
      dosages,
      condition,
      notes,
      lastGivenOn,
      frequency,
    });
    if (!payload) return;

    updateCurrentPet({ medications: [buildMedicationEntry()] });
    nextStep();
  }, [
    medName,
    dosages,
    condition,
    notes,
    lastGivenOn,
    frequency,
    buildMedicationEntry,
    updateCurrentPet,
    nextStep,
  ]);

  const showErrorHint = useMemo(() => {
    if (!validationAttempted) return null;
    if (nameError) return "Enter a medication name.";
    if (needsFirstDosage)
      return "Add at least one dosage using Add dosage below.";
    if (dosageAmountMissing)
      return "Enter an amount and type for each dosage — tap a row to edit it.";
    return null;
  }, [validationAttempted, nameError, needsFirstDosage, dosageAmountMissing]);

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
      {/*
        Do not nest ScrollView here: OnboardingCard already scrolls. Nested
        scroll views break Pressable taps (edit/delete dosage buttons).
      */}
      <View>
        <Text style={authOnboardingStyles.screenTitleForm}>
          Medications for {name}
        </Text>
        <Text style={authOnboardingStyles.formHelperText}>
          Add each dosage time and amount below — we&apos;ll use those times on
          the schedule.
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

        <PetMedicationFrequencySection
          draft={frequency}
          onChange={setFrequency}
          lastGivenOn={lastGivenOn}
        />

        <PetMedicationDosageScheduleSection
          dosages={dosages}
          onAddDosage={openAddDosage}
          onEditDosage={openEditDosage}
          onRemoveDosage={removeDosage}
          scheduleLabelError={scheduleLabelError}
          addDosageButtonError={needsFirstDosage}
          hint={dosageScheduleHint(frequency.kind)}
          dosageRowAmountMissing={(idx) =>
            validationAttempted &&
            (!dosages[idx]?.dosageAmount.trim() ||
              !dosages[idx]?.dosageType.trim())
          }
        />

        <PetMedicationLastGivenSection
          value={lastGivenOn}
          onChangeDate={setLastGivenOn}
          onClearDate={() => setLastGivenOn("")}
          helperText={lastGivenHelperText(
            frequency.kind,
            lastGivenOn.trim().length > 0,
          )}
          maximumDate={lastGivenMaxDateRef.current}
        />

        <PetMedicationNotesSection
          petName={name}
          value={notes}
          onChangeText={setNotes}
        />

        {showErrorHint ? (
          <Text style={medStyles.formErrorHint}>{showErrorHint}</Text>
        ) : null}

        <View style={onboardingStyles.spacer} />

        <OrangeButton onPress={handleContinue} style={onboardingStyles.cta}>
          Continue
        </OrangeButton>

        <TouchableOpacity
          onPress={() => setPhase("prompt")}
          style={onboardingStyles.backButton}
        >
          <Text style={authOnboardingStyles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <MedicationDosageEditorModal
        visible={dosageModalVisible}
        title={dosageModalTitle}
        initial={dosageEditorDraft}
        onClose={() => {
          setDosageModalVisible(false);
          setEditingDosageIndex(null);
          setDosageEditorDraft(null);
        }}
        onSave={saveDosageFromModal}
      />
    </View>
  );
}
