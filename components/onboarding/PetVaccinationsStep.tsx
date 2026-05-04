import ExpiryDateField from "@/components/onboarding/ExpiryDateField";
import FormInput from "@/components/onboarding/FormInput";
import OptInStep from "@/components/onboarding/OptInStep";
import { petCareStyles as styles } from "@/components/onboarding/petCareStyles";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { authOnboardingStyles } from "@/constants/authOnboardingStyles";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useShallow } from "zustand/react/shallow";
import type { VaccinationFormEntry } from "@/types/database";
import {
  defaultVaccinationExpiryYmd,
  startOfTomorrowLocal,
  vaccinationExpiryPickerMaxDate,
} from "@/utils/localCalendarDate";
import { useCallback, useEffect, useRef, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

export default function PetVaccinationsStep() {
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

  const vaccinationExpiryMinRef = useRef(startOfTomorrowLocal());
  const vaccinationExpiryMaxRef = useRef(vaccinationExpiryPickerMaxDate());

  const [phase, setPhase] = useState<"prompt" | "form">(() =>
    pet.vaccinations.length > 0 ? "form" : "prompt",
  );

  const [vacName, setVacName] = useState("");
  const [vacExpiresOn, setVacExpiresOn] = useState(() =>
    defaultVaccinationExpiryYmd(),
  );
  const [vacNotes, setVacNotes] = useState("");

  useEffect(() => {
    const v = pet.vaccinations[0];
    if (!v) {
      setVacName("");
      setVacExpiresOn(defaultVaccinationExpiryYmd());
      setVacNotes("");
      return;
    }
    setVacName(v.name);
    setVacExpiresOn(v.expiresOn.trim() || defaultVaccinationExpiryYmd());
    setVacNotes(v.notes);
  }, [pet.vaccinations[0]?.localId, currentPetIndex]);

  const buildVaccinationEntry = useCallback((): VaccinationFormEntry => {
    return {
      localId: pet.vaccinations[0]?.localId ?? Date.now().toString(),
      name: vacName.trim(),
      expiresOn: vacExpiresOn.trim(),
      notes: vacNotes.trim(),
    };
  }, [
    pet.vaccinations[0]?.localId,
    vacName,
    vacExpiresOn,
    vacNotes,
  ]);

  const handleContinue = useCallback(() => {
    if (vacName.trim()) {
      updateCurrentPet({ vaccinations: [buildVaccinationEntry()] });
    } else {
      updateCurrentPet({ vaccinations: [] });
    }
    nextStep();
  }, [vacName, buildVaccinationEntry, updateCurrentPet, nextStep]);

  if (phase === "prompt") {
    return (
      <OptInStep
        title={`Add vaccinations for ${name}?`}
        subtitle="Record vaccines and expiry dates on the next screen, or skip for now."
        yesLabel="Yes, add vaccinations"
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
        Vaccinations for {name}
      </Text>
      <Text style={authOnboardingStyles.formHelperText}>
        Optional — add shots on file so we can remind you before they expire
      </Text>

      <FormInput
        placeholder="Vaccine name (e.g. Rabies, DHPP)"
        value={vacName}
        onChangeText={setVacName}
        containerStyle={styles.inputSpacing}
      />
      <Text style={styles.fieldLabel}>Next expiry</Text>
      <ExpiryDateField
        value={vacExpiresOn}
        onChangeDate={setVacExpiresOn}
        onClearDate={() => setVacExpiresOn("")}
        minimumDate={vaccinationExpiryMinRef.current}
        maximumDate={vaccinationExpiryMaxRef.current}
      />
      <FormInput
        placeholder="Notes"
        value={vacNotes}
        onChangeText={setVacNotes}
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
