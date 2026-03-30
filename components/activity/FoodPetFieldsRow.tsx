import DropdownSelect from "@/components/onboarding/DropdownSelect";
import FormInput from "@/components/onboarding/FormInput";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { usePetDetailsQuery } from "@/hooks/queries";
import type { FoodActivityExtraPetRow } from "@/lib/foodActivityMerge";
import { FOOD_ACTIVITY_OTHER_ID } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const PORTION_UNITS = ["Cups", "Ounces", "Piece(s)"] as const;
const OTHER_FOOD_DROPDOWN_LABEL = "Other (not listed)";

type Props = {
  petName: string;
  row: FoodActivityExtraPetRow;
  rowIndex: number;
  isTreat: boolean;
  attempted: boolean;
  embeddedInScreen?: boolean;
  onChange: (index: number, patch: Partial<FoodActivityExtraPetRow>) => void;
  onRemove: () => void;
};

export default function FoodPetFieldsRow({
  petName,
  row,
  rowIndex,
  isTreat,
  attempted,
  embeddedInScreen = false,
  onChange,
  onRemove,
}: Props) {
  const { data: petDetails } = usePetDetailsQuery(row.petId);

  const foodOptions = useMemo(() => {
    if (!petDetails) return [];
    return petDetails.foods
      .filter((f) => (isTreat ? f.is_treat : !f.is_treat))
      .map((f) => ({ id: f.id, label: f.brand }));
  }, [petDetails, isTreat]);

  const dropdownLabels = useMemo(
    () => [...foodOptions.map((o) => o.label), OTHER_FOOD_DROPDOWN_LABEL],
    [foodOptions],
  );

  const isOtherFood = row.foodId === FOOD_ACTIVITY_OTHER_ID;

  const dropdownDisplayValue = useMemo(() => {
    if (isOtherFood) return OTHER_FOOD_DROPDOWN_LABEL;
    return foodOptions.find((o) => o.id === row.foodId)?.label ?? "";
  }, [isOtherFood, foodOptions, row.foodId]);

  const foodMissing =
    attempted &&
    (isOtherFood ? !row.foodBrand.trim() : !row.foodId.length);
  const foodDropdownError = attempted && !isOtherFood && !row.foodId.length;
  const unitRowError = attempted && !row.unit.trim();

  const fieldLabelStyle = embeddedInScreen
    ? styles.fieldLabelScreen
    : styles.fieldLabel;
  const blockSpacing = embeddedInScreen ? styles.spacingScreen : styles.spacing;

  return (
    <View style={styles.wrap}>
      <View style={styles.rowHeader}>
        <Text style={styles.petTitle}>{petName}</Text>
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${petName} from this meal`}
        >
          <MaterialCommunityIcons
            name="close-circle"
            size={22}
            color={Colors.gray400}
          />
        </Pressable>
      </View>

      <Text style={[fieldLabelStyle, foodMissing && styles.fieldLabelError]}>
        Food *
      </Text>
      <View style={{ zIndex: 70, marginBottom: embeddedInScreen ? 16 : 12 }}>
        <DropdownSelect
          placeholder="Select a food"
          value={dropdownDisplayValue}
          options={dropdownLabels}
          error={foodDropdownError}
          onSelect={(label) => {
            if (label === OTHER_FOOD_DROPDOWN_LABEL) {
              onChange(rowIndex, {
                foodId: FOOD_ACTIVITY_OTHER_ID,
                foodBrand: "",
              });
              return;
            }
            const match = foodOptions.find((o) => o.label === label);
            if (match)
              onChange(rowIndex, { foodId: match.id, foodBrand: match.label });
          }}
        />
      </View>

      {isOtherFood ? (
        <FormInput
          label="Food name"
          required
          placeholder="e.g. Cheese cube, bully stick…"
          value={row.foodBrand}
          onChangeText={(v) => onChange(rowIndex, { foodBrand: v })}
          containerStyle={blockSpacing}
          error={attempted && !row.foodBrand.trim()}
        />
      ) : null}

      <Text
        style={[
          fieldLabelStyle,
          ((attempted && !row.amount.trim()) || unitRowError) &&
            styles.fieldLabelError,
        ]}
      >
        Amount *
      </Text>
      <View style={styles.amountRow}>
        <FormInput
          placeholder="Amt"
          value={row.amount}
          onChangeText={(v) => onChange(rowIndex, { amount: v })}
          keyboardType="numeric"
          containerStyle={styles.amountInput}
          error={attempted && !row.amount.trim()}
        />
        <View
          style={[
            styles.portionToggleRow,
            unitRowError && styles.portionToggleRowError,
          ]}
        >
          {PORTION_UNITS.map((unit, i) => (
            <Pressable
              key={unit}
              style={[
                styles.portionToggle,
                i < PORTION_UNITS.length - 1 && styles.portionToggleBorder,
                row.unit === unit && styles.portionToggleActive,
              ]}
              onPress={() => onChange(rowIndex, { unit })}
            >
              <Text
                style={[
                  styles.portionToggleText,
                  row.unit === unit && styles.portionToggleTextActive,
                ]}
              >
                {unit}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.gray200,
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  petTitle: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  fieldLabel: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  fieldLabelScreen: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  fieldLabelError: {
    color: Colors.error,
  },
  spacing: { marginBottom: 12 },
  spacingScreen: { marginBottom: 16 },
  amountRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  amountInput: { width: 80 },
  portionToggleRow: {
    flexDirection: "row",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.gray200,
    height: 50,
    flex: 1,
  },
  portionToggleRowError: {
    borderColor: Colors.error,
  },
  portionToggle: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  portionToggleBorder: {
    borderRightWidth: 1,
    borderRightColor: Colors.gray200,
  },
  portionToggleActive: { backgroundColor: Colors.orangeLight },
  portionToggleText: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  portionToggleTextActive: {
    fontFamily: "InstrumentSans-Bold",
    color: Colors.orange,
  },
});
