import FormInput from "@/components/onboarding/FormInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const ENERGY_OPTIONS = ["low", "medium", "high"] as const;

export default function PetInfoStep() {
  const { pets, currentPetIndex, updateCurrentPet, nextStep, prevStep } =
    useOnboardingStore();
  const pet = pets[currentPetIndex];

  const canContinue = pet.name.trim().length > 0;

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
            <Image
              source={{ uri: pet.avatarUri }}
              style={styles.avatarImage}
            />
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
        placeholder="Pet's Name"
        value={pet.name}
        onChangeText={(v) => updateCurrentPet({ name: v })}
        autoCapitalize="words"
        containerStyle={styles.inputSpacing}
      />

      <FormInput
        placeholder="Pet's Breed"
        value={pet.breed}
        onChangeText={(v) => updateCurrentPet({ breed: v })}
        autoCapitalize="words"
        containerStyle={styles.inputSpacing}
      />

      <View style={styles.row}>
        <FormInput
          placeholder="Age"
          value={pet.age}
          onChangeText={(v) => updateCurrentPet({ age: v })}
          keyboardType="numeric"
          containerStyle={styles.halfInput}
        />
        <FormInput
          placeholder="Weight"
          value={pet.weightLbs}
          onChangeText={(v) => updateCurrentPet({ weightLbs: v })}
          keyboardType="numeric"
          containerStyle={styles.halfInput}
        />
      </View>

      <View style={[styles.row, styles.inputSpacing]}>
        <Pressable
          style={[
            styles.toggleOption,
            pet.sex === "male" && styles.toggleActive,
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

      <FormInput
        placeholder="Allergies (comma separated)"
        value={pet.allergies}
        onChangeText={(v) => updateCurrentPet({ allergies: v })}
        containerStyle={styles.inputSpacing}
      />

      {/* Energy level */}
      <Text style={styles.sectionTitle}>Energy Level</Text>
      <View style={styles.row}>
        {ENERGY_OPTIONS.map((level) => (
          <Pressable
            key={level}
            style={[
              styles.toggleOption,
              pet.energyLevel === level && styles.toggleActive,
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

      {/* Co-carer invite */}
      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
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

      <OrangeButton
        onPress={nextStep}
        disabled={!canContinue}
        style={styles.cta}
      >
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
