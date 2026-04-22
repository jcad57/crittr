import { petCareStyles as styles } from "@/components/onboarding/petCareStyles";
import { stepStyles } from "@/components/onboarding/PetFoodStep.styles";
import { Colors } from "@/constants/colors";
import type { MealPortionDraft } from "@/utils/petFood";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

type Props = {
  mealPortions: MealPortionDraft[];
  petName: string;
  onAddPortion: () => void;
  onEditPortion: (index: number) => void;
  onRemovePortion: (index: number) => void;
};

export default function PetFoodMealScheduleSection({
  mealPortions,
  petName,
  onAddPortion,
  onEditPortion,
  onRemovePortion,
}: Props) {
  return (
    <>
      <Text style={styles.fieldLabel}>Feeding schedule</Text>
      <Text style={stepStyles.mealHint}>
        Add multiple portions if you feed your pet multiple times a day.
        Each includes amount, unit, and the time you usually feed — Pro
        members get reminders when it's time to feed{" "}
        {petName || "your pet"}!
      </Text>
      {mealPortions.map((row, index) => (
        <View key={row.key} style={stepStyles.portionCard}>
          <View style={stepStyles.portionCardMain}>
            <Text style={stepStyles.portionCardTitle}>
              {row.feedTime.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </Text>
            <Text style={stepStyles.portionCardSub} numberOfLines={2}>
              {[row.portionSize.trim(), row.portionUnit]
                .filter(Boolean)
                .join(" ") || "—"}
            </Text>
          </View>
          <View style={stepStyles.portionCardActions}>
            <Pressable
              style={({ pressed }) => [
                stepStyles.portionIconBtn,
                pressed && stepStyles.portionIconBtnPressed,
              ]}
              onPress={() => onEditPortion(index)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Edit portion"
            >
              <MaterialCommunityIcons
                name="pencil-outline"
                size={22}
                color={Colors.orange}
              />
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                stepStyles.portionIconBtn,
                pressed && stepStyles.portionIconBtnPressed,
              ]}
              onPress={() => onRemovePortion(index)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Remove portion"
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={22}
                color={Colors.error}
              />
            </Pressable>
          </View>
        </View>
      ))}
      <Pressable
        style={({ pressed }) => [
          stepStyles.addPortionBtn,
          pressed && stepStyles.addPortionBtnPressed,
        ]}
        onPress={onAddPortion}
      >
        <MaterialCommunityIcons
          name="plus-circle-outline"
          size={22}
          color={Colors.orange}
        />
        <Text style={stepStyles.addPortionBtnText}>Add a portion</Text>
      </Pressable>
    </>
  );
}
