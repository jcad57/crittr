import AutocompleteInput from "@/components/onboarding/AutocompleteInput";
import FormInput from "@/components/onboarding/FormInput";
import PetAgeOrDobSection from "@/components/onboarding/petInfo/PetAgeOrDobSection";
import PetAvatarSection from "@/components/onboarding/petInfo/PetAvatarSection";
import PetEnergyLevelToggle from "@/components/onboarding/petInfo/PetEnergyLevelToggle";
import PetSexToggle from "@/components/onboarding/petInfo/PetSexToggle";
import PetCatLitterSection from "@/components/onboarding/petInfo/PetCatLitterSection";
import PetSterilizationToggle from "@/components/onboarding/petInfo/PetSterilizationToggle";
import PetWeightFields from "@/components/onboarding/petInfo/PetWeightFields";
import TagInput from "@/components/onboarding/TagInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { authOnboardingStyles } from "@/constants/authOnboardingStyles";
import { Colors } from "@/constants/colors";
import {
  getBreedLabelForPetType,
  PET_INFO_FIELD_MARGIN_BOTTOM,
  shouldShowExerciseField,
} from "@/constants/petInfo";
import { Font } from "@/constants/typography";
import { useOnboardingStore } from "@/stores/onboardingStore";
import type { LitterCleaningPeriod } from "@/types/database";
import { useShallow } from "zustand/react/shallow";
import { useAllergiesQuery, useBreedsQuery } from "@/hooks/queries";
import { yearsMonthsFromBirthDate } from "@/utils/petAge";
import {
  getPetInfoMissingFields,
  isPetInfoComplete,
  type PetInfoMissingFields,
} from "@/utils/petInfoValidation";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function PetDetailsStep() {
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
  const [attempted, setAttempted] = useState(false);

  const { data: breeds } = useBreedsQuery(pet.petType);
  const { data: allergySuggestions } = useAllergiesQuery(pet.petType);

  const breedNames = useMemo(
    () => (breeds ?? []).map((b) => b.name),
    [breeds],
  );
  const allergyNames = useMemo(
    () => (allergySuggestions ?? []).map((a) => a.name),
    [allergySuggestions],
  );

  const breedLabel = getBreedLabelForPetType(pet.petType);
  const showExercise = shouldShowExerciseField(pet.petType);

  const missing = useMemo(
    () => getPetInfoMissingFields(pet, showExercise),
    [pet, showExercise],
  );

  const isValid = isPetInfoComplete(missing);

  const handleContinue = useCallback(() => {
    if (!isValid) {
      setAttempted(true);
      return;
    }
    nextStep();
  }, [isValid, nextStep]);

  const err = (field: keyof PetInfoMissingFields) =>
    attempted && missing[field];

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      updateCurrentPet({ avatarUri: result.assets[0].uri });
    }
  };

  const handleDobChange = useCallback(
    (iso: string) => {
      const { years, months } = yearsMonthsFromBirthDate(iso);
      updateCurrentPet({
        dateOfBirth: iso,
        ageYears: String(years),
        ageMonths: String(months),
      });
    },
    [updateCurrentPet],
  );

  const handleClearDob = useCallback(() => {
    updateCurrentPet({ dateOfBirth: "", ageYears: "", ageMonths: "" });
  }, [updateCurrentPet]);

  const handleAgeYearsChange = useCallback(
    (v: string) => {
      updateCurrentPet({ ageYears: v, dateOfBirth: "" });
    },
    [updateCurrentPet],
  );

  const handleAgeMonthsChange = useCallback(
    (v: string) => {
      updateCurrentPet({ ageMonths: v, dateOfBirth: "" });
    },
    [updateCurrentPet],
  );

  return (
    <View style={styles.container}>
      <Text style={[authOnboardingStyles.screenTitle, { marginBottom: 20 }]}>
        Tell us about your pet!
      </Text>

      <PetAvatarSection avatarUri={pet.avatarUri} onPickImage={pickImage} />

      <Text style={authOnboardingStyles.sectionTitle}>Basic Info</Text>

      <FormInput
        label="Pet's name"
        required
        placeholder="Name"
        value={pet.name}
        onChangeText={(v) => updateCurrentPet({ name: v })}
        autoCapitalize="words"
        containerStyle={styles.inputSpacing}
        error={!!err("name")}
      />

      <AutocompleteInput
        label={breedLabel}
        required
        placeholder="Search or type a breed"
        value={pet.breed}
        onChangeText={(v) => updateCurrentPet({ breed: v })}
        onSelect={(v) => updateCurrentPet({ breed: v })}
        suggestions={breedNames}
        containerStyle={styles.inputSpacing}
        error={!!err("breed")}
      />

      <PetAgeOrDobSection
        ageYears={pet.ageYears}
        ageMonths={pet.ageMonths}
        dateOfBirth={pet.dateOfBirth}
        onAgeYearsChange={handleAgeYearsChange}
        onAgeMonthsChange={handleAgeMonthsChange}
        onChangeDate={handleDobChange}
        onClearDate={handleClearDob}
        ageOrDobError={!!err("ageYears")}
      />

      <PetWeightFields
        weight={pet.weight}
        weightUnit={pet.weightUnit}
        onWeightChange={(v) => updateCurrentPet({ weight: v })}
        onWeightUnitChange={(unit) => updateCurrentPet({ weightUnit: unit })}
        weightError={!!err("weight")}
      />

      <PetSexToggle
        sex={pet.sex}
        onChange={(sex) => updateCurrentPet({ sex })}
        error={!!err("sex")}
      />

      <PetSterilizationToggle
        value={pet.isSterilized}
        onChange={(v) => updateCurrentPet({ isSterilized: v })}
      />

      <FormInput
        label="Coat color"
        placeholder="e.g. Golden, tabby"
        value={pet.color}
        onChangeText={(v) => updateCurrentPet({ color: v })}
        autoCapitalize="words"
        containerStyle={styles.inputSpacing}
      />

      <PetEnergyLevelToggle
        energyLevel={pet.energyLevel}
        onChange={(level) => updateCurrentPet({ energyLevel: level })}
        error={!!err("energyLevel")}
      />

      {showExercise ? (
        <FormInput
          label="Number of activities per day"
          required
          placeholder={
            pet.petType === "cat"
              ? "e.g. play time, laser pointer, wand toys"
              : "Include walks, dog park visits, etc."
          }
          value={pet.exercisesPerDay}
          onChangeText={(v) => updateCurrentPet({ exercisesPerDay: v })}
          keyboardType="numeric"
          containerStyle={styles.inputSpacing}
          error={!!err("exercisesPerDay")}
        />
      ) : null}

      {pet.petType === "cat" ? (
        <PetCatLitterSection
          litterCleaningPeriod={pet.litterCleaningPeriod}
          litterCleaningsPerPeriod={pet.litterCleaningsPerPeriod}
          onPeriodChange={(p: LitterCleaningPeriod) =>
            updateCurrentPet({ litterCleaningPeriod: p })
          }
          onCleaningsChange={(v) =>
            updateCurrentPet({ litterCleaningsPerPeriod: v })
          }
          periodError={!!err("litterCleaningPeriod")}
          cleaningsError={!!err("litterCleaningsPerPeriod")}
        />
      ) : null}

      <Text style={authOnboardingStyles.sectionTitle}>Allergies</Text>
      <TagInput
        placeholder="Search or type an allergy…"
        tags={pet.allergies}
        onAddTag={(tag) =>
          updateCurrentPet({ allergies: [...pet.allergies, tag] })
        }
        onRemoveTag={(tag) =>
          updateCurrentPet({
            allergies: pet.allergies.filter((a) => a !== tag),
          })
        }
        suggestions={allergyNames}
        containerStyle={styles.inputSpacing}
      />

      <Text style={authOnboardingStyles.sectionTitle}>About</Text>
      <Text style={styles.aboutHint}>Short bio (max 320 characters)</Text>
      <View style={[styles.aboutBox, styles.inputSpacing]}>
        <TextInput
          style={styles.aboutInput}
          placeholder="What makes your pet special?"
          placeholderTextColor={Colors.gray400}
          value={pet.about}
          onChangeText={(v) => updateCurrentPet({ about: v })}
          multiline
          maxLength={320}
          textAlignVertical="top"
        />
      </View>

      {attempted && !isValid ? (
        <Text style={styles.errorHint}>
          Please fill in all required fields above
        </Text>
      ) : null}

      <OrangeButton onPress={handleContinue} style={styles.cta}>
        Continue
      </OrangeButton>

      <TouchableOpacity onPress={prevStep} style={styles.backButton}>
        <Text style={authOnboardingStyles.backText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  aboutHint: {
    fontFamily: Font.uiRegular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: -4,
  },
  aboutBox: {
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 12,
    minHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
  },
  aboutInput: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textPrimary,
    minHeight: 88,
    lineHeight: 22,
    paddingTop: -4,
  },
  inputSpacing: {
    marginBottom: PET_INFO_FIELD_MARGIN_BOTTOM,
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
  errorHint: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.error,
    textAlign: "center",
    marginBottom: 8,
  },
  cta: {
    marginTop: 12,
  },
  backButton: {
    alignSelf: "center",
    paddingVertical: 16,
  },
});
