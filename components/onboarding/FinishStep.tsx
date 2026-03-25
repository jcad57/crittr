import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { createPet } from "@/services/pets";
import { useAuthStore } from "@/stores/authStore";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { usePetStore } from "@/stores/petStore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function FinishStep() {
  const router = useRouter();
  const { pets, addAnotherPet, editPetAtIndex, prevStep, reset } =
    useOnboardingStore();
  const session = useAuthStore((s) => s.session);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const fetchPets = usePetStore((s) => s.fetchPets);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFinish = async () => {
    if (!session) return;
    setIsSubmitting(true);
    try {
      for (let i = 0; i < pets.length; i++) {
        await createPet(session.user.id, pets[i], i === 0);
      }

      await completeOnboarding();
      await fetchPets();
      reset();
      router.replace("/(logged-in)/dashboard");
    } catch (error: any) {
      Alert.alert("Error", error.message ?? "Failed to complete onboarding.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconCenter}>
        <MaterialCommunityIcons name="paw" size={48} color={Colors.orange} />
      </View>

      <Text style={styles.title}>You're all set!</Text>
      <Text style={styles.subtitle}>
        {pets.length === 1
          ? "Here's the pet you've added:"
          : `Here are the ${pets.length} pets you've added:`}
      </Text>

      {/* Pet chips */}
      <View style={styles.chipContainer}>
        {pets.map((p, i) => (
          <View key={i} style={styles.chip}>
            <View style={styles.chipLeft}>
              <View style={styles.chipTitleRow}>
                <MaterialCommunityIcons
                  name="paw"
                  size={16}
                  color={Colors.orange}
                />
                <Text style={styles.chipName}>{p.name || `Pet ${i + 1}`}</Text>
              </View>
              {p.breed ? (
                <Text style={styles.chipBreed}>{p.breed}</Text>
              ) : null}
            </View>
            <Pressable
              onPress={() => editPetAtIndex(i)}
              hitSlop={8}
              style={({ pressed }) => [
                styles.editHit,
                pressed && styles.editHitPressed,
              ]}
            >
              <Text style={styles.editLabel}>Edit</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={styles.spacer} />

      {/* Add Another Pet */}
      <Pressable style={styles.addButton} onPress={addAnotherPet}>
        <MaterialCommunityIcons name="plus" size={20} color={Colors.orange} />
        <Text style={styles.addButtonText}>Add Another Pet</Text>
      </Pressable>

      {/* Finish */}
      <OrangeButton
        onPress={handleFinish}
        disabled={isSubmitting}
        style={styles.cta}
      >
        {isSubmitting ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          "Finish"
        )}
      </OrangeButton>

      <Pressable onPress={prevStep} style={styles.backButton}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  iconCenter: {
    alignItems: "center",
    marginBottom: 16,
    marginTop: 12,
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
    marginBottom: 24,
  },
  chipContainer: {
    gap: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 14,
    backgroundColor: Colors.gray50,
  },
  chipLeft: {
    flex: 1,
    minWidth: 0,
  },
  chipTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  chipName: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 16,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  chipBreed: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    marginLeft: 26,
  },
  editHit: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  editHitPressed: {
    opacity: 0.65,
  },
  editLabel: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 15,
    color: Colors.orange,
  },
  spacer: {
    flex: 1,
    minHeight: 32,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: Colors.orange,
    borderRadius: 999,
    height: 50,
    marginBottom: 12,
  },
  addButtonText: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 16,
    color: Colors.orange,
  },
  cta: {
    marginBottom: 0,
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
