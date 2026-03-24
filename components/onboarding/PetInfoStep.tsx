import AutocompleteInput from "@/components/onboarding/AutocompleteInput";
import FormInput from "@/components/onboarding/FormInput";
import TagInput from "@/components/onboarding/TagInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useReferenceStore } from "@/stores/referenceStore";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const ENERGY_OPTIONS = ["low", "medium", "high"] as const;

const BREED_LABELS: Record<string, string> = {
  dog: "Breed",
  cat: "Breed",
  fish: "Species",
  bird: "Species",
  reptile: "Species",
  other: "Type / Breed",
};

const EXERCISE_PET_TYPES = new Set(["dog", "other"]);

export default function PetInfoStep() {
  const { pets, currentPetIndex, updateCurrentPet, nextStep, prevStep } =
    useOnboardingStore();
  const pet = pets[currentPetIndex];
  const [attempted, setAttempted] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

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

  const breedLabel = BREED_LABELS[pet.petType] ?? "Breed / Species";
  const showExercise = EXERCISE_PET_TYPES.has(pet.petType);

  const missing = useMemo(() => {
    const m = {
      name: !pet.name.trim(),
      breed: !pet.breed.trim(),
      ageYears: !pet.ageYears.trim(),
      weight: !pet.weight.trim(),
      sex: pet.sex === "",
      energyLevel: pet.energyLevel === "",
      exercisesPerDay: showExercise && !pet.exercisesPerDay.trim(),
    };
    return m;
  }, [pet, showExercise]);

  const isValid = !Object.values(missing).some(Boolean);

  const handleContinue = useCallback(() => {
    if (!isValid) {
      setAttempted(true);
      return;
    }
    nextStep();
  }, [isValid, nextStep]);

  const err = (field: keyof typeof missing) => attempted && missing[field];

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

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <TouchableOpacity style={styles.avatarCircle} onPress={pickImage}>
          {pet.avatarUri ? (
            <Image source={{ uri: pet.avatarUri }} style={styles.avatarImage} />
          ) : (
            <MaterialCommunityIcons
              name="paw"
              size={40}
              color={Colors.gray300}
            />
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={pickImage}>
          <Text style={styles.uploadLabel}>Upload Photo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>Basic Info</Text>

      <FormInput
        placeholder="Pet's Name *"
        value={pet.name}
        onChangeText={(v) => updateCurrentPet({ name: v })}
        autoCapitalize="words"
        containerStyle={styles.inputSpacing}
        error={!!err("name")}
      />

      {/* Breed / Species autocomplete */}
      <AutocompleteInput
        placeholder={`${breedLabel} *`}
        value={pet.breed}
        onChangeText={(v) => updateCurrentPet({ breed: v })}
        onSelect={(v) => updateCurrentPet({ breed: v })}
        suggestions={breedNames}
        containerStyle={styles.inputSpacing}
        error={!!err("breed")}
      />

      {/* Age: Years + Months */}
      <Text style={[styles.fieldLabel, err("ageYears") && styles.fieldLabelError]}>
        Age *
      </Text>
      <View style={styles.row}>
        <FormInput
          placeholder="Years"
          value={pet.ageYears}
          onChangeText={(v) => updateCurrentPet({ ageYears: v })}
          keyboardType="numeric"
          containerStyle={styles.halfInput}
          error={!!err("ageYears")}
        />
        <FormInput
          placeholder="Months"
          value={pet.ageMonths}
          onChangeText={(v) => updateCurrentPet({ ageMonths: v })}
          keyboardType="numeric"
          containerStyle={styles.halfInput}
        />
      </View>

      {/* Date of Birth (optional) */}
      <TouchableOpacity
        style={styles.datePickerButton}
        onPress={() => setShowDatePicker(true)}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name="calendar"
          size={20}
          color={Colors.gray400}
          style={{ marginRight: 10 }}
        />
        <Text
          style={[
            styles.datePickerText,
            !pet.dateOfBirth && styles.datePickerPlaceholder,
          ]}
        >
          {pet.dateOfBirth
            ? new Date(pet.dateOfBirth).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })
            : "Date of Birth - Optional"}
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={pet.dateOfBirth ? new Date(pet.dateOfBirth) : new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          maximumDate={new Date()}
          onChange={(_event, selectedDate) => {
            setShowDatePicker(Platform.OS === "ios");
            if (selectedDate) {
              updateCurrentPet({
                dateOfBirth: selectedDate.toISOString().split("T")[0],
              });
            }
          }}
        />
      )}
      {pet.dateOfBirth && (
        <TouchableOpacity
          onPress={() => updateCurrentPet({ dateOfBirth: "" })}
          style={styles.clearDateButton}
        >
          <Text style={styles.clearDateText}>Clear date</Text>
        </TouchableOpacity>
      )}

      {/* Weight + Unit Toggle */}
      <Text style={[styles.fieldLabel, err("weight") && styles.fieldLabelError]}>
        Weight *
      </Text>
      <View style={styles.row}>
        <FormInput
          placeholder="Weight"
          value={pet.weight}
          onChangeText={(v) => updateCurrentPet({ weight: v })}
          keyboardType="numeric"
          containerStyle={{ flex: 1 }}
          error={!!err("weight")}
        />
        <View style={styles.unitToggleRow}>
          <Pressable
            style={[
              styles.unitToggle,
              styles.unitToggleLeft,
              pet.weightUnit === "lbs" && styles.unitToggleActive,
            ]}
            onPress={() => updateCurrentPet({ weightUnit: "lbs" })}
          >
            <Text
              style={[
                styles.unitToggleText,
                pet.weightUnit === "lbs" && styles.unitToggleTextActive,
              ]}
            >
              lbs
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.unitToggle,
              styles.unitToggleRight,
              pet.weightUnit === "kg" && styles.unitToggleActive,
            ]}
            onPress={() => updateCurrentPet({ weightUnit: "kg" })}
          >
            <Text
              style={[
                styles.unitToggleText,
                pet.weightUnit === "kg" && styles.unitToggleTextActive,
              ]}
            >
              kg
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Sex */}
      <Text style={[styles.fieldLabel, err("sex") && styles.fieldLabelError]}>
        Sex *
      </Text>
      <View style={[styles.row, styles.inputSpacing]}>
        <Pressable
          style={[
            styles.toggleOption,
            pet.sex === "male" && styles.toggleActive,
            err("sex") && styles.toggleError,
          ]}
          onPress={() => updateCurrentPet({ sex: "male" })}
        >
          <Text
            style={[
              styles.toggleText,
              pet.sex === "male" && styles.toggleTextActive,
            ]}
          >
            Male
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.toggleOption,
            pet.sex === "female" && styles.toggleActive,
            err("sex") && styles.toggleError,
          ]}
          onPress={() => updateCurrentPet({ sex: "female" })}
        >
          <Text
            style={[
              styles.toggleText,
              pet.sex === "female" && styles.toggleTextActive,
            ]}
          >
            Female
          </Text>
        </Pressable>
      </View>

      {/* Energy level */}
      <Text
        style={[
          styles.sectionTitle,
          err("energyLevel") && styles.sectionTitleError,
        ]}
      >
        Energy Level *
      </Text>
      <View style={styles.row}>
        {ENERGY_OPTIONS.map((level) => (
          <Pressable
            key={level}
            style={[
              styles.toggleOption,
              pet.energyLevel === level && styles.toggleActive,
              err("energyLevel") && styles.toggleError,
            ]}
            onPress={() => updateCurrentPet({ energyLevel: level })}
          >
            <Text
              style={[
                styles.toggleText,
                pet.energyLevel === level && styles.toggleTextActive,
              ]}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Exercises per day — only for dogs and "other" */}
      {showExercise && (
        <FormInput
          placeholder="Exercises per day *"
          value={pet.exercisesPerDay}
          onChangeText={(v) => updateCurrentPet({ exercisesPerDay: v })}
          keyboardType="numeric"
          containerStyle={styles.inputSpacing}
          error={!!err("exercisesPerDay")}
        />
      )}

      {/* Allergies with tag input */}
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

      {/* Co-carer invite */}
      <Text style={[styles.sectionTitle, { marginTop: 8 }]}>
        Does anyone else help you care for this pet?
      </Text>
      <View style={styles.inviteRow}>
        <FormInput
          icon="email-outline"
          placeholder="Enter their email"
          value={pet.coCarerEmail}
          onChangeText={(v) => updateCurrentPet({ coCarerEmail: v })}
          keyboardType="email-address"
          autoCapitalize="none"
          containerStyle={styles.inviteInput}
        />
        <TouchableOpacity style={styles.inviteButton}>
          <Text style={styles.inviteButtonText}>Invite</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.spacer} />

      {attempted && !isValid && (
        <Text style={styles.errorHint}>
          Please fill in all required fields above
        </Text>
      )}

      <OrangeButton onPress={handleContinue} style={styles.cta}>
        Continue
      </OrangeButton>

      <TouchableOpacity onPress={prevStep} style={styles.backButton}>
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const AVATAR_SIZE = 100;

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
  avatarSection: {
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  avatarCircle: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: Colors.gray100,
    borderWidth: 2,
    borderColor: Colors.gray200,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  uploadLabel: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 14,
    color: Colors.textPrimary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 8,
    overflow: "hidden",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.gray200,
    marginVertical: 20,
  },
  sectionTitle: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  sectionTitleError: {
    color: Colors.error,
  },
  fieldLabel: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  fieldLabelError: {
    color: Colors.error,
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  datePickerText: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 15,
    color: Colors.textPrimary,
  },
  datePickerPlaceholder: {
    color: Colors.gray400,
  },
  clearDateButton: {
    alignSelf: "flex-end",
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  clearDateText: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  inputSpacing: {
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  halfInput: {
    flex: 1,
  },
  unitToggleRow: {
    flexDirection: "row",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  unitToggle: {
    paddingHorizontal: 16,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  unitToggleLeft: {
    borderRightWidth: 1,
    borderRightColor: Colors.gray200,
  },
  unitToggleRight: {},
  unitToggleActive: {
    backgroundColor: Colors.orangeLight,
  },
  unitToggleText: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  unitToggleTextActive: {
    fontFamily: "InstrumentSans-Bold",
    color: Colors.orange,
  },
  toggleOption: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleActive: {
    backgroundColor: Colors.orangeLight,
    borderColor: Colors.orange,
  },
  toggleError: {
    borderColor: Colors.error,
  },
  toggleText: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  toggleTextActive: {
    fontFamily: "InstrumentSans-Bold",
    color: Colors.orange,
  },
  inviteRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  inviteInput: {
    flex: 1,
  },
  inviteButton: {
    backgroundColor: Colors.orange,
    paddingHorizontal: 20,
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteButtonText: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 15,
    color: Colors.white,
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
