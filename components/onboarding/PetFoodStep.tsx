import DropdownSelect from "@/components/onboarding/DropdownSelect";
import FormInput from "@/components/onboarding/FormInput";
import { petCareStyles as styles } from "@/components/onboarding/petCareStyles";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { authOnboardingStyles } from "@/constants/authOnboardingStyles";
import { Colors } from "@/constants/colors";
import { useOnboardingStore } from "@/stores/onboardingStore";
import type { FoodFormEntry } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { Pressable, Text, TouchableOpacity, View } from "react-native";

const PORTION_UNITS = ["Cups", "Ounces", "Piece(s)"] as const;
const TIMES_QUICK = ["1", "2", "3", "4", "5", "6", "7", "8"];

export default function PetFoodStep() {
  const { pets, currentPetIndex, updateCurrentPet, nextStep, prevStep } =
    useOnboardingStore();
  const pet = pets[currentPetIndex];
  const [attempted, setAttempted] = useState(false);

  const [foodBrand, setFoodBrand] = useState("");
  const [foodPortion, setFoodPortion] = useState("");
  const [foodUnit, setFoodUnit] = useState<string>("Cups");
  const [foodIsTreat, setFoodIsTreat] = useState(false);
  const [foodTimesPerDay, setFoodTimesPerDay] = useState("");
  const [foodNotes, setFoodNotes] = useState("");

  const isValid = pet.foods.length > 0;

  const showFieldErrors = attempted && !isValid;
  const brandErr = showFieldErrors && !foodBrand.trim();
  const timesErr =
    showFieldErrors &&
    (!foodTimesPerDay.trim() || !TIMES_QUICK.includes(foodTimesPerDay));

  const handleContinue = useCallback(() => {
    if (!isValid) {
      setAttempted(true);
      return;
    }
    nextStep();
  }, [isValid, nextStep]);

  const addFood = () => {
    const times = parseInt(foodTimesPerDay.trim(), 10);
    if (!foodBrand.trim() || !Number.isFinite(times) || times < 1) return;
    const entry: FoodFormEntry = {
      localId: Date.now().toString(),
      brand: foodBrand.trim(),
      portionSize: foodPortion,
      portionUnit: foodUnit,
      mealsPerDay: String(times),
      isTreat: foodIsTreat,
      notes: foodNotes.trim(),
    };
    updateCurrentPet({ foods: [...pet.foods, entry] });
    setFoodBrand("");
    setFoodPortion("");
    setFoodUnit("Cups");
    setFoodIsTreat(false);
    setFoodTimesPerDay("");
    setFoodNotes("");
  };

  const removeFood = (localId: string) => {
    updateCurrentPet({
      foods: pet.foods.filter((f) => f.localId !== localId),
    });
  };

  return (
    <View style={styles.container}>
      <Text style={[authOnboardingStyles.screenTitle, { marginBottom: 12 }]}>
        What do you feed {pet.name || "your pet"}?
      </Text>

      <View style={styles.iconCenter}>
        <MaterialCommunityIcons
          name="food-drumstick"
          size={40}
          color={Colors.gray800}
        />
      </View>

      <View style={styles.foodSection}>
        <Text
          style={[
            styles.sectionTitle,
            showFieldErrors && styles.sectionTitleError,
          ]}
        >
          Meals & treats *
        </Text>
        <Text style={styles.helperText}>
          Add at least one meal or treat. Fill brand, amount, unit, and times
          per day, then tap &quot;Add this food&quot;.
        </Text>

        <View style={styles.foodNameRow}>
          <View style={styles.foodNameField}>
            <FormInput
              label="Food brand"
              required
              placeholder="Purina, Blue, etc."
              value={foodBrand}
              onChangeText={setFoodBrand}
              containerStyle={styles.foodNameInput}
              error={brandErr}
            />
          </View>
          <View style={styles.mealTreatToggleRow}>
            <Pressable
              style={[
                styles.mealTreatToggle,
                styles.mealTreatToggleBorder,
                !foodIsTreat && styles.portionToggleActive,
              ]}
              onPress={() => setFoodIsTreat(false)}
            >
              <Text
                style={[
                  styles.mealTreatToggleText,
                  !foodIsTreat && styles.portionToggleTextActive,
                ]}
              >
                Meal
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.mealTreatToggle,
                foodIsTreat && styles.portionToggleActive,
              ]}
              onPress={() => setFoodIsTreat(true)}
            >
              <Text
                style={[
                  styles.mealTreatToggleText,
                  foodIsTreat && styles.portionToggleTextActive,
                ]}
              >
                Treat
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.amountUnitRow}>
          <View style={styles.amountField}>
            <FormInput
              label="Amount"
              placeholder="Amt"
              value={foodPortion}
              onChangeText={setFoodPortion}
              keyboardType="numeric"
              containerStyle={styles.amountInputContainer}
            />
          </View>
          <View style={styles.amountUnitTogglesWrap}>
            <View style={styles.portionToggleRow}>
              {PORTION_UNITS.map((unit, i) => (
                <Pressable
                  key={unit}
                  style={[
                    styles.portionToggle,
                    i < PORTION_UNITS.length - 1 && styles.portionToggleBorder,
                    foodUnit === unit && styles.portionToggleActive,
                  ]}
                  onPress={() => setFoodUnit(unit)}
                >
                  <Text
                    style={[
                      styles.portionToggleText,
                      foodUnit === unit && styles.portionToggleTextActive,
                    ]}
                  >
                    {unit}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <Text
          style={[
            styles.fieldLabel,
            timesErr && styles.fieldLabelError,
          ]}
        >
          Times per day *
        </Text>
        <View style={[styles.row3, styles.timesRow]}>
          <DropdownSelect
            placeholder="Quick select"
            value={TIMES_QUICK.includes(foodTimesPerDay) ? foodTimesPerDay : ""}
            options={TIMES_QUICK}
            onSelect={(v) => setFoodTimesPerDay(v)}
            containerStyle={styles.timesDropdown}
            error={timesErr}
          />
        </View>

        <FormInput
          label="Notes"
          placeholder="e.g. 2 cups in the morning, 1 cup at night"
          value={foodNotes}
          onChangeText={setFoodNotes}
          multiline
          containerStyle={styles.notesField}
          style={styles.notesMultiline}
        />

        <Pressable style={styles.addButton} onPress={addFood}>
          <Text style={styles.addButtonText}>+ Add this food</Text>
        </Pressable>

        {pet.foods.length > 0 && (
          <View style={styles.listCard}>
            {pet.foods.map((f) => (
              <View key={f.localId} style={styles.listRow}>
                <View style={styles.listRowText}>
                  <Text style={styles.listItemBold}>{f.brand}</Text>
                  <Text style={styles.listItemSub}>
                    {f.isTreat ? "Treat" : "Meal"} · {f.portionSize}{" "}
                    {f.portionUnit} · {f.mealsPerDay}x daily
                  </Text>
                  {f.notes.trim() ? (
                    <Text style={styles.listItemNotes} numberOfLines={3}>
                      {f.notes.trim()}
                    </Text>
                  ) : null}
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
      </View>

      <View style={styles.spacer} />

      {showFieldErrors && (
        <Text style={styles.errorHint}>
          Add at least one food using the form above, or fix any fields marked
          in red.
        </Text>
      )}

      <OrangeButton onPress={handleContinue} style={styles.cta}>
        Continue
      </OrangeButton>

      <TouchableOpacity onPress={prevStep} style={styles.backButton}>
        <Text style={authOnboardingStyles.backText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}
