import FormInput from "@/components/onboarding/FormInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { useOnboardingStore } from "@/stores/onboardingStore";
import type { FoodFormEntry, MedicationFormEntry } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function PetCareStep() {
  const { pets, currentPetIndex, updateCurrentPet, nextStep, prevStep } =
    useOnboardingStore();
  const pet = pets[currentPetIndex];

  // Local state for the "add food" form
  const [foodBrand, setFoodBrand] = useState("");
  const [foodPortion, setFoodPortion] = useState("");
  const [foodUnit, setFoodUnit] = useState("Cups");
  const [foodFreq, setFoodFreq] = useState("Per day");

  // Local state for the "add medication" form
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medFreq, setMedFreq] = useState("");
  const [medCondition, setMedCondition] = useState("");

  const addFood = () => {
    if (!foodBrand.trim()) return;
    const entry: FoodFormEntry = {
      localId: Date.now().toString(),
      brand: foodBrand.trim(),
      portionSize: foodPortion,
      portionUnit: foodUnit,
      mealsPerDay: foodFreq,
      isTreat: false,
    };
    updateCurrentPet({ foods: [...pet.foods, entry] });
    setFoodBrand("");
    setFoodPortion("");
  };

  const removeFood = (localId: string) => {
    updateCurrentPet({ foods: pet.foods.filter((f) => f.localId !== localId) });
  };

  const addMedication = () => {
    if (!medName.trim()) return;
    const entry: MedicationFormEntry = {
      localId: Date.now().toString(),
      name: medName.trim(),
      dosage: medDosage,
      frequency: medFreq,
      condition: medCondition,
    };
    updateCurrentPet({ medications: [...pet.medications, entry] });
    setMedName("");
    setMedDosage("");
    setMedFreq("");
    setMedCondition("");
  };

  const removeMed = (localId: string) => {
    updateCurrentPet({
      medications: pet.medications.filter((m) => m.localId !== localId),
    });
  };

  return (
    <View style={styles.container}>
      {/* ── Food ─────────────────────────────────────────────── */}
      <Text style={styles.title}>
        What do you feed {pet.name || "your pet"}?
      </Text>

      <View style={styles.iconCenter}>
        <MaterialCommunityIcons
          name="food-drumstick"
          size={40}
          color={Colors.gray800}
        />
      </View>

      <Text style={styles.sectionTitle}>Meals & Treats</Text>

      <FormInput
        placeholder="Purina, Blue, etc."
        value={foodBrand}
        onChangeText={setFoodBrand}
        containerStyle={styles.inputSpacing}
      />

      <View style={styles.row3}>
        <FormInput
          placeholder="2"
          value={foodPortion}
          onChangeText={setFoodPortion}
          keyboardType="numeric"
          containerStyle={styles.smallInput}
        />
        <FormInput
          placeholder="Cups"
          value={foodUnit}
          onChangeText={setFoodUnit}
          containerStyle={styles.medInput}
        />
        <FormInput
          placeholder="Per day"
          value={foodFreq}
          onChangeText={setFoodFreq}
          containerStyle={styles.medInput}
        />
      </View>

      {/* Added foods list */}
      {pet.foods.length > 0 && (
        <View style={styles.listCard}>
          {pet.foods.map((f) => (
            <View key={f.localId} style={styles.listRow}>
              <View style={styles.listRowText}>
                <Text style={styles.listItemBold}>{f.brand}</Text>
                <Text style={styles.listItemSub}>
                  {f.portionSize} {f.portionUnit} {f.mealsPerDay}
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeFood(f.localId)}>
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

      <Pressable style={styles.addButton} onPress={addFood}>
        <Text style={styles.addButtonText}>+ Add another food</Text>
      </Pressable>

      <View style={styles.divider} />

      {/* ── Medications ──────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Medications</Text>

      <FormInput
        placeholder="Medication name"
        value={medName}
        onChangeText={setMedName}
        containerStyle={styles.inputSpacing}
      />

      <View style={styles.row3}>
        <FormInput
          placeholder="Dosage"
          value={medDosage}
          onChangeText={setMedDosage}
          containerStyle={styles.medInput}
        />
        <FormInput
          placeholder="Frequency"
          value={medFreq}
          onChangeText={setMedFreq}
          containerStyle={styles.medInput}
        />
      </View>

      <FormInput
        placeholder="Condition (e.g. Allergies)"
        value={medCondition}
        onChangeText={setMedCondition}
        containerStyle={styles.inputSpacing}
      />

      {pet.medications.length > 0 && (
        <View style={styles.listCard}>
          {pet.medications.map((m) => (
            <View key={m.localId} style={styles.listRow}>
              <View style={styles.listRowText}>
                <Text style={styles.listItemBold}>{m.name}</Text>
                <Text style={styles.listItemSub}>
                  {m.dosage} &middot; {m.frequency}
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeMed(m.localId)}>
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

      <Pressable style={styles.addButton} onPress={addMedication}>
        <Text style={styles.addButtonText}>+ Add medication</Text>
      </Pressable>

      <View style={styles.spacer} />

      <OrangeButton onPress={nextStep} style={styles.cta}>
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
    fontSize: 24,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 12,
  },
  iconCenter: {
    alignItems: "center",
    marginBottom: 20,
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
  row3: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  smallInput: {
    width: 60,
  },
  medInput: {
    flex: 1,
  },
  listCard: {
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 12,
  },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listRowText: {
    flex: 1,
  },
  listItemBold: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  listItemSub: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  addButton: {
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 12,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  addButtonText: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 15,
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.gray200,
    marginVertical: 20,
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
