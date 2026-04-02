import FormInput from "@/components/onboarding/FormInput";
import OptInStep from "@/components/onboarding/OptInStep";
import PetInsuranceToggle from "@/components/onboarding/petInfo/PetInsuranceToggle";
import PetMicrochipToggle from "@/components/onboarding/petInfo/PetMicrochipToggle";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { authOnboardingStyles } from "@/constants/authOnboardingStyles";
import { PET_INFO_FIELD_MARGIN_BOTTOM } from "@/constants/petInfo";
import type { PetFormData } from "@/types/database";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

function hasHealthDetails(pet: PetFormData) {
  return (
    pet.isMicrochipped === true ||
    pet.isInsured === true ||
    Boolean(pet.microchipNumber?.trim()) ||
    Boolean(pet.insuranceProvider?.trim()) ||
    Boolean(pet.insurancePolicyNumber?.trim())
  );
}

export default function PetHealthRecordsStep() {
  const { pets, currentPetIndex, updateCurrentPet, nextStep, prevStep } =
    useOnboardingStore();
  const pet = pets[currentPetIndex];
  const name = pet.name?.trim() || "your pet";

  const [phase, setPhase] = useState<"prompt" | "form">(() =>
    hasHealthDetails(pet) ? "form" : "prompt",
  );

  if (phase === "prompt") {
    return (
      <OptInStep
        title={`Add health records for ${name}?`}
        subtitle="Microchip and insurance details on the next screen — or skip for now."
        yesLabel="Yes, add details"
        noLabel="Skip"
        onYes={() => setPhase("form")}
        onNo={() => nextStep()}
        onBack={prevStep}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[authOnboardingStyles.screenTitle, { marginBottom: 16 }]}>
        Health & identification
      </Text>

      <PetMicrochipToggle
        value={pet.isMicrochipped}
        onChange={(v) =>
          updateCurrentPet({
            isMicrochipped: v,
            microchipNumber: v === true ? pet.microchipNumber : "",
          })
        }
      />

      {pet.isMicrochipped === true ? (
        <FormInput
          label="Microchip number"
          placeholder="e.g. 1234567890"
          value={pet.microchipNumber}
          onChangeText={(v) => updateCurrentPet({ microchipNumber: v })}
          keyboardType="number-pad"
          containerStyle={styles.inputSpacing}
        />
      ) : null}

      <PetInsuranceToggle
        value={pet.isInsured}
        onChange={(v) =>
          updateCurrentPet({
            isInsured: v,
            insuranceProvider: v === true ? pet.insuranceProvider : "",
            insurancePolicyNumber: v === true ? pet.insurancePolicyNumber : "",
          })
        }
      />

      {pet.isInsured === true ? (
        <>
          <FormInput
            label="Insurance company"
            placeholder="e.g. Trupanion, Nationwide"
            value={pet.insuranceProvider}
            onChangeText={(v) => updateCurrentPet({ insuranceProvider: v })}
            autoCapitalize="words"
            containerStyle={styles.inputSpacing}
          />
          <FormInput
            label="Policy number"
            placeholder="Policy or member ID"
            value={pet.insurancePolicyNumber}
            onChangeText={(v) =>
              updateCurrentPet({ insurancePolicyNumber: v })
            }
            autoCapitalize="none"
            containerStyle={styles.inputSpacing}
          />
        </>
      ) : null}

      <View style={styles.spacer} />

      <OrangeButton onPress={nextStep} style={styles.cta}>
        Continue
      </OrangeButton>

      <TouchableOpacity
        onPress={() => setPhase("prompt")}
        style={styles.backButton}
      >
        <Text style={authOnboardingStyles.backText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inputSpacing: {
    marginBottom: PET_INFO_FIELD_MARGIN_BOTTOM,
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
  cta: {
    marginTop: 12,
  },
  backButton: {
    alignSelf: "center",
    paddingVertical: 16,
  },
});
