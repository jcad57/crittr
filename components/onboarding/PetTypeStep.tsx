import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useReferenceStore } from "@/stores/referenceStore";
import type { PetType } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const PET_TYPES: {
  id: PetType;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { id: "dog", label: "Dog", icon: "dog" },
  { id: "cat", label: "Cat", icon: "cat" },
  { id: "fish", label: "Fish", icon: "fish" },
  { id: "bird", label: "Bird", icon: "bird" },
  { id: "reptile", label: "Reptile", icon: "snake" },
  { id: "other", label: "Other", icon: "paw" },
];

export default function PetTypeStep() {
  const { pets, currentPetIndex, updateCurrentPet, nextStep, prevStep } =
    useOnboardingStore();
  const fetchForPetType = useReferenceStore((s) => s.fetchForPetType);
  const pet = pets[currentPetIndex];

  const handleSelect = (type: PetType) => {
    updateCurrentPet({ petType: type });
    fetchForPetType(type);
  };

  const handleContinue = () => {
    if (!pet.petType) {
      Alert.alert(
        "Select a pet type",
        "Please choose a pet type before you can continue.",
      );
      return;
    }
    nextStep();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What type of pet do you have?</Text>
      <Text style={styles.subtitle}>
        This helps us tailor the experience for your pet.
      </Text>

      <View style={styles.grid}>
        {PET_TYPES.map((pt) => {
          const isActive = pet.petType === pt.id;
          return (
            <Pressable
              key={pt.id}
              style={[styles.card, isActive && styles.cardActive]}
              onPress={() => handleSelect(pt.id)}
            >
              <View
                style={[
                  styles.iconCircle,
                  isActive && styles.iconCircleActive,
                ]}
              >
                <MaterialCommunityIcons
                  name={pt.icon}
                  size={28}
                  color={isActive ? Colors.orange : Colors.gray400}
                />
              </View>
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {pt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.spacer} />

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
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 28,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  card: {
    width: "47%",
    alignItems: "center",
    paddingVertical: 20,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: 16,
    gap: 8,
  },
  cardActive: {
    borderColor: Colors.orange,
    backgroundColor: Colors.orangeLight,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleActive: {
    backgroundColor: Colors.white,
  },
  label: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 15,
    color: Colors.textSecondary,
  },
  labelActive: {
    fontFamily: "InstrumentSans-Bold",
    color: Colors.orange,
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
