import FormInput from "@/components/onboarding/FormInput";
import OptInStep from "@/components/onboarding/OptInStep";
import { petCareStyles } from "@/components/onboarding/petCareStyles";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { authOnboardingStyles } from "@/constants/authOnboardingStyles";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

function hasVetDetails(p: {
  primaryVetClinic: string;
  primaryVetAddress: string;
}) {
  return (
    Boolean(p.primaryVetClinic?.trim()) ||
    Boolean(p.primaryVetAddress?.trim())
  );
}

export default function PetVetClinicStep() {
  const { pets, currentPetIndex, updateCurrentPet, nextStep, prevStep } =
    useOnboardingStore();
  const pet = pets[currentPetIndex];
  const name = pet.name?.trim() || "your pet";

  const [phase, setPhase] = useState<"prompt" | "form">(() =>
    hasVetDetails(pet) ? "form" : "prompt",
  );

  if (phase === "prompt") {
    return (
      <OptInStep
        title={`Want to add ${name}'s vet clinic?`}
        subtitle="You can add clinic name and address next, or skip for now."
        yesLabel="Yes, add clinic"
        noLabel="Skip"
        onYes={() => setPhase("form")}
        onNo={() => nextStep()}
        onBack={prevStep}
      />
    );
  }

  return (
    <View style={petCareStyles.formContainer}>
      <Text style={authOnboardingStyles.screenTitleForm}>Vet clinic</Text>
      <Text style={authOnboardingStyles.screenSubtitleForm}>
        Primary clinic for {name} (optional details)
      </Text>

      <FormInput
        label="Primary vet clinic"
        placeholder="Clinic name"
        value={pet.primaryVetClinic}
        onChangeText={(v) => updateCurrentPet({ primaryVetClinic: v })}
        autoCapitalize="words"
        containerStyle={styles.inputSpacing}
      />

      <FormInput
        label="Vet clinic address"
        placeholder="Street, city"
        value={pet.primaryVetAddress}
        onChangeText={(v) => updateCurrentPet({ primaryVetAddress: v })}
        autoCapitalize="words"
        containerStyle={styles.inputSpacing}
      />

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
  inputSpacing: {
    marginBottom: 12,
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
