import FormInput from "@/components/onboarding/FormInput";
import OptInStep from "@/components/onboarding/OptInStep";
import { petCareStyles } from "@/components/onboarding/petCareStyles";
import PetInsuranceToggle from "@/components/onboarding/petInfo/PetInsuranceToggle";
import PetMicrochipToggle from "@/components/onboarding/petInfo/PetMicrochipToggle";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { authOnboardingStyles } from "@/constants/authOnboardingStyles";
import { Colors } from "@/constants/colors";
import { PET_INFO_FIELD_MARGIN_BOTTOM } from "@/constants/petInfo";
import { Font } from "@/constants/typography";
import { useOnboardingStore } from "@/stores/onboardingStore";
import type { PetFormData } from "@/types/database";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useShallow } from "zustand/react/shallow";

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
    hasHealthDetails(pet) ? "form" : "prompt",
  );

  if (phase === "prompt") {
    return (
      <OptInStep
        title={`Add health records for ${name}?`}
        subtitle="Add microchip and insurance details for now - upgrade to Pro to upload medical records and documents directly to your pet's profile."
        yesLabel="Yes, add details"
        noLabel="Skip"
        onYes={() => setPhase("form")}
        onNo={() => nextStep()}
        onBack={prevStep}
      />
    );
  }

  return (
    <View style={petCareStyles.formContainer}>
      <Text style={authOnboardingStyles.screenTitleForm}>
        Health & identification
      </Text>
      <Text style={authOnboardingStyles.screenSubtitleForm}>
        Microchip and insurance (optional). You can skip anything you don&apos;t
        have on hand.
      </Text>

      <View style={styles.proCallout}>
        <Text style={styles.proCalloutLabel}>Crittr Pro</Text>
        <Text style={styles.proCalloutBody}>
          Upgrade to Pro to upload medical records and documents directly to{" "}
          {name}&apos;s profile — visit summaries, lab results, and more in one
          place.
        </Text>
      </View>

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
            onChangeText={(v) => updateCurrentPet({ insurancePolicyNumber: v })}
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
  proCallout: {
    width: "100%",
    marginBottom: PET_INFO_FIELD_MARGIN_BOTTOM + 4,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.orange,
    backgroundColor: Colors.orangeLight,
  },
  proCalloutLabel: {
    fontFamily: Font.uiBold,
    fontSize: 12,
    letterSpacing: 0.6,
    color: Colors.orange,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  proCalloutBody: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textPrimary,
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
