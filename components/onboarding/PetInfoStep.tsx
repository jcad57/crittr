import AutocompleteInput from "@/components/onboarding/AutocompleteInput";
import FormInput from "@/components/onboarding/FormInput";
import PetAgeFields from "@/components/onboarding/petInfo/PetAgeFields";
import PetAvatarSection from "@/components/onboarding/petInfo/PetAvatarSection";
import PetCoCarerInviteRow from "@/components/onboarding/petInfo/PetCoCarerInviteRow";
import PetDateOfBirthField from "@/components/onboarding/petInfo/PetDateOfBirthField";
import PetEnergyLevelToggle from "@/components/onboarding/petInfo/PetEnergyLevelToggle";
import PetInsuranceToggle from "@/components/onboarding/petInfo/PetInsuranceToggle";
import PetMicrochipToggle from "@/components/onboarding/petInfo/PetMicrochipToggle";
import PetSexToggle from "@/components/onboarding/petInfo/PetSexToggle";
import PetSterilizationToggle from "@/components/onboarding/petInfo/PetSterilizationToggle";
import PetWeightFields from "@/components/onboarding/petInfo/PetWeightFields";
import TagInput from "@/components/onboarding/TagInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import Divider from "@/components/ui/Divider";
import { Colors } from "@/constants/colors";
import {
  getBreedLabelForPetType,
  PET_INFO_FIELD_MARGIN_BOTTOM,
  shouldShowExerciseField,
} from "@/constants/petInfo";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useReferenceStore } from "@/stores/referenceStore";
import {
  getPetInfoMissingFields,
  isPetInfoComplete,
  type PetInfoMissingFields,
} from "@/utils/petInfoValidation";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function PetInfoStep() {
  const { pets, currentPetIndex, updateCurrentPet, nextStep, prevStep } =
    useOnboardingStore();
  const pet = pets[currentPetIndex];
  const [attempted, setAttempted] = useState(false);

  const fetchForPetType = useReferenceStore((s) => s.fetchForPetType);
  const breeds = useReferenceStore((s) => s.breeds[pet.petType] ?? []);
  const allergySuggestions = useReferenceStore(
    (s) => s.allergies[pet.petType] ?? [],
  );

  useEffect(() => {
    if (pet.petType) fetchForPetType(pet.petType);
  }, [pet.petType, fetchForPetType]);

  const breedNames = useMemo(() => breeds.map((b) => b.name), [breeds]);
  const allergyNames = useMemo(
    () => allergySuggestions.map((a) => a.name),
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tell us about your pet!</Text>

      <PetAvatarSection avatarUri={pet.avatarUri} onPickImage={pickImage} />

      <Divider />

      <Text style={styles.sectionTitle}>Basic Info</Text>

      <FormInput
        placeholder="Pet's Name *"
        value={pet.name}
        onChangeText={(v) => updateCurrentPet({ name: v })}
        autoCapitalize="words"
        containerStyle={styles.inputSpacing}
        error={!!err("name")}
      />

      <AutocompleteInput
        placeholder={`${breedLabel} *`}
        value={pet.breed}
        onChangeText={(v) => updateCurrentPet({ breed: v })}
        onSelect={(v) => updateCurrentPet({ breed: v })}
        suggestions={breedNames}
        containerStyle={styles.inputSpacing}
        error={!!err("breed")}
      />

      <PetAgeFields
        ageYears={pet.ageYears}
        ageMonths={pet.ageMonths}
        onAgeYearsChange={(v) => updateCurrentPet({ ageYears: v })}
        onAgeMonthsChange={(v) => updateCurrentPet({ ageMonths: v })}
        ageYearsError={!!err("ageYears")}
      />

      <PetDateOfBirthField
        dateOfBirth={pet.dateOfBirth}
        onChangeDate={(iso) => updateCurrentPet({ dateOfBirth: iso })}
        onClearDate={() => updateCurrentPet({ dateOfBirth: "" })}
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
        placeholder="Coat color (optional)"
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
          placeholder="Exercises per day *"
          value={pet.exercisesPerDay}
          onChangeText={(v) => updateCurrentPet({ exercisesPerDay: v })}
          keyboardType="numeric"
          containerStyle={styles.inputSpacing}
          error={!!err("exercisesPerDay")}
        />
      ) : null}

      <Divider />

      <Text style={styles.sectionTitle}>Health & identification</Text>

      <FormInput
        placeholder="Primary vet clinic (optional)"
        value={pet.primaryVetClinic}
        onChangeText={(v) => updateCurrentPet({ primaryVetClinic: v })}
        autoCapitalize="words"
        containerStyle={styles.inputSpacing}
      />

      <FormInput
        placeholder="Vet clinic address (optional)"
        value={pet.primaryVetAddress}
        onChangeText={(v) => updateCurrentPet({ primaryVetAddress: v })}
        autoCapitalize="words"
        containerStyle={styles.inputSpacing}
      />

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
          placeholder="Microchip number (optional)"
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
          })
        }
      />

      {pet.isInsured === true ? (
        <FormInput
          placeholder="Insurance provider (optional)"
          value={pet.insuranceProvider}
          onChangeText={(v) => updateCurrentPet({ insuranceProvider: v })}
          autoCapitalize="words"
          containerStyle={styles.inputSpacing}
        />
      ) : null}

      <Text style={styles.sectionTitle}>Allergies</Text>
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

      <Divider />

      <Text style={styles.sectionTitle}>About</Text>
      <Text style={styles.aboutHint}>
        Short bio (optional, max 320 characters)
      </Text>
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

      <PetCoCarerInviteRow
        coCarerEmail={pet.coCarerEmail}
        onChangeEmail={(v) => updateCurrentPet({ coCarerEmail: v })}
      />

      <View style={styles.spacer} />

      {attempted && !isValid ? (
        <Text style={styles.errorHint}>
          Please fill in all required fields above
        </Text>
      ) : null}

      <OrangeButton onPress={handleContinue} style={styles.cta}>
        Continue
      </OrangeButton>

      <TouchableOpacity onPress={prevStep} style={styles.backButton}>
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 26,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  aboutHint: {
    fontFamily: "InstrumentSans-Regular",
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
    fontFamily: "InstrumentSans-Regular",
    fontSize: 15,
    color: Colors.textPrimary,
    minHeight: 88,
    lineHeight: 22,
  },
  inputSpacing: {
    marginBottom: PET_INFO_FIELD_MARGIN_BOTTOM,
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
  errorHint: {
    fontFamily: "InstrumentSans-SemiBold",
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
  backText: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 15,
    color: Colors.textSecondary,
  },
});
