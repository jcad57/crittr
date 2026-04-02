import ExpiryDateField from "@/components/onboarding/ExpiryDateField";
import FormInput from "@/components/onboarding/FormInput";
import OptInStep from "@/components/onboarding/OptInStep";
import { petCareStyles as styles } from "@/components/onboarding/petCareStyles";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { authOnboardingStyles } from "@/constants/authOnboardingStyles";
import { Colors } from "@/constants/colors";
import { useOnboardingStore } from "@/stores/onboardingStore";
import type { VaccinationFormEntry } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, TouchableOpacity, View } from "react-native";

export default function PetVaccinationsStep() {
  const { pets, currentPetIndex, updateCurrentPet, nextStep, prevStep } =
    useOnboardingStore();
  const pet = pets[currentPetIndex];
  const name = pet.name?.trim() || "your pet";

  const [phase, setPhase] = useState<"prompt" | "form">(() =>
    pet.vaccinations.length > 0 ? "form" : "prompt",
  );

  const [vacName, setVacName] = useState("");
  const [vacFrequencyLabel, setVacFrequencyLabel] = useState("");
  const [vacExpiresOn, setVacExpiresOn] = useState("");
  const [vacNotes, setVacNotes] = useState("");

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
    <View style={styles.container}>
      <Text style={[authOnboardingStyles.screenTitle, { marginBottom: 12 }]}>
        Vaccinations for {name}
      </Text>
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

      <OrangeButton onPress={nextStep} style={styles.cta}>
        Continue
      </OrangeButton>

      <TouchableOpacity onPress={() => setPhase("prompt")} style={styles.backButton}>
        <Text style={authOnboardingStyles.backText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}
