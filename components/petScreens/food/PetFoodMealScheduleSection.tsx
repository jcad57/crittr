import { styles } from "@/screen-styles/pet/[id]/food/[foodId].styles";
import { Colors } from "@/constants/colors";
import type { MealPortionDraft } from "@/utils/petFood";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

type Props = {
  mealPortions: MealPortionDraft[];
  petNameForTitle: string;
  onAddPortion: () => void;
  onEditPortion: (index: number) => void;
  onRemovePortion: (index: number) => void;
};

export default function PetFoodMealScheduleSection({
  mealPortions,
  petNameForTitle,
  onAddPortion,
  onEditPortion,
  onRemovePortion,
}: Props) {
  return (
    <>
      <Text style={styles.fieldLabel}>Feeding schedule</Text>
      <Text style={styles.mealHint}>
        Add multiple portions if you feed {petNameForTitle} this
        meal/treat multiple times a day. Each input includes amount,
        unit, and the time you usually feed them!
      </Text>
      {mealPortions.map((row, index) => (
        <View key={row.key} style={styles.portionCard}>
          <View style={styles.portionCardMain}>
            <Text style={styles.portionCardTitle}>
              {row.feedTime.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </Text>
            <Text style={styles.portionCardSub} numberOfLines={2}>
              {[row.portionSize.trim(), row.portionUnit]
                .filter(Boolean)
                .join(" ") || "—"}
            </Text>
          </View>
          <View style={styles.portionCardActions}>
            <Pressable
              style={({ pressed }) => [
                styles.portionIconBtn,
                pressed && styles.portionIconBtnPressed,
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
                styles.portionIconBtn,
                pressed && styles.portionIconBtnPressed,
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
          styles.addPortionBtn,
          pressed && styles.addPortionBtnPressed,
        ]}
        onPress={onAddPortion}
      >
        <MaterialCommunityIcons
          name="plus-circle-outline"
          size={22}
          color={Colors.orange}
        />
        <Text style={styles.addPortionBtnText}>Add a portion</Text>
      </Pressable>
    </>
  );
}
