import DropdownSelect from "@/components/onboarding/DropdownSelect";
import FormInput from "@/components/onboarding/FormInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { usePetDetailsQuery } from "@/hooks/queries";
import { useActivityFormStore } from "@/stores/activityFormStore";
import { usePetStore } from "@/stores/petStore";
import { FOOD_ACTIVITY_OTHER_ID } from "@/types/database";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const PORTION_UNITS = ["Cups", "Ounces", "Piece(s)"];

/** Dropdown label for foods not saved on the pet profile (avoids colliding with a brand named "Other"). */
const OTHER_FOOD_DROPDOWN_LABEL = "Other (not listed)";

type Props = {
  onSave: () => Promise<void>;
  onBack: () => void;
  /** @default "Save" */
  saveLabel?: string;
};

export default function FoodDetailStep({
  onSave,
  onBack,
  saveLabel = "Save",
}: Props) {
  const form = useActivityFormStore((s) => s.foodForm);
  const update = useActivityFormStore((s) => s.updateFood);
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const activePetId = usePetStore((s) => s.activePetId);
  const { data: petDetails } = usePetDetailsQuery(activePetId);

  const foodOptions = useMemo(() => {
    if (!petDetails) return [];
    return petDetails.foods
      .filter((f) => (form.isTreat ? f.is_treat : !f.is_treat))
      .map((f) => ({ id: f.id, label: f.brand }));
  }, [petDetails, form.isTreat]);

  const dropdownLabels = useMemo(
    () => [...foodOptions.map((o) => o.label), OTHER_FOOD_DROPDOWN_LABEL],
    [foodOptions],
  );

  const isOtherFood = form.foodId === FOOD_ACTIVITY_OTHER_ID;

  const dropdownDisplayValue = useMemo(() => {
    if (isOtherFood) return OTHER_FOOD_DROPDOWN_LABEL;
    return foodOptions.find((o) => o.id === form.foodId)?.label ?? "";
  }, [isOtherFood, foodOptions, form.foodId]);

  const isValid =
    form.label.trim().length > 0 &&
    form.amount.trim().length > 0 &&
    (isOtherFood
      ? form.foodBrand.trim().length > 0
      : form.foodId.length > 0);

  const handleSave = useCallback(async () => {
    if (!isValid) {
      setAttempted(true);
      return;
    }
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  }, [isValid, onSave]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Food Details</Text>

      <FormInput
        label="Label"
        required
        placeholder="Morning meal, Dinner, Treat time…"
        value={form.label}
        onChangeText={(v) => update({ label: v })}
        containerStyle={styles.spacing}
        error={attempted && !form.label.trim()}
      />

      <Text style={styles.fieldLabel}>Type *</Text>
      <View style={styles.toggleRow}>
        <Pressable
          style={[
            styles.toggle,
            styles.toggleBorder,
            !form.isTreat && styles.toggleActive,
          ]}
          onPress={() =>
            update({ isTreat: false, foodId: "", foodBrand: "" })
          }
        >
          <Text
            style={[
              styles.toggleText,
              !form.isTreat && styles.toggleTextActive,
            ]}
          >
            Meal
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggle, form.isTreat && styles.toggleActive]}
          onPress={() =>
            update({ isTreat: true, foodId: "", foodBrand: "" })
          }
        >
          <Text
            style={[styles.toggleText, form.isTreat && styles.toggleTextActive]}
          >
            Treat
          </Text>
        </Pressable>
      </View>

      <Text style={styles.fieldLabel}>Food *</Text>
      <View style={{ zIndex: 80, marginBottom: 12 }}>
        <DropdownSelect
          placeholder="Select a food"
          value={dropdownDisplayValue}
          options={dropdownLabels}
          onSelect={(label) => {
            if (label === OTHER_FOOD_DROPDOWN_LABEL) {
              update({
                foodId: FOOD_ACTIVITY_OTHER_ID,
                foodBrand: "",
              });
              return;
            }
            const match = foodOptions.find((o) => o.label === label);
            if (match) update({ foodId: match.id, foodBrand: match.label });
          }}
        />
      </View>

      {isOtherFood ? (
        <FormInput
          label="Food name"
          required
          placeholder="e.g. Cheese cube, bully stick, table scraps…"
          value={form.foodBrand}
          onChangeText={(v) => update({ foodBrand: v })}
          containerStyle={styles.spacing}
          error={attempted && !form.foodBrand.trim()}
        />
      ) : null}

      <Text style={styles.fieldLabel}>Amount *</Text>
      <View style={styles.amountRow}>
        <FormInput
          placeholder="Amt"
          value={form.amount}
          onChangeText={(v) => update({ amount: v })}
          keyboardType="numeric"
          containerStyle={styles.amountInput}
          error={attempted && !form.amount.trim()}
        />
        <View style={styles.portionToggleRow}>
          {PORTION_UNITS.map((unit, i) => (
            <Pressable
              key={unit}
              style={[
                styles.portionToggle,
                i < PORTION_UNITS.length - 1 && styles.portionToggleBorder,
                form.unit === unit && styles.portionToggleActive,
              ]}
              onPress={() => update({ unit })}
            >
              <Text
                style={[
                  styles.portionToggleText,
                  form.unit === unit && styles.portionToggleTextActive,
                ]}
              >
                {unit}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FormInput
        label="Notes"
        placeholder="Any notes about this meal or treat"
        value={form.notes}
        onChangeText={(v) => update({ notes: v })}
        multiline
        containerStyle={styles.spacing}
      />

      <View style={styles.spacer} />

      {attempted && !isValid && (
        <Text style={styles.errorHint}>Please fill in all required fields</Text>
      )}

      <OrangeButton onPress={handleSave} disabled={saving} style={styles.cta}>
        {saving ? <ActivityIndicator color={Colors.white} /> : saveLabel}
      </OrangeButton>

      <Pressable onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 26,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 20,
  },
  fieldLabel: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  spacing: { marginBottom: 12 },
  toggleRow: {
    flexDirection: "row",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.gray200,
    height: 44,
    marginBottom: 12,
  },
  toggle: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleBorder: {
    borderRightWidth: 1,
    borderRightColor: Colors.gray200,
  },
  toggleActive: {
    backgroundColor: Colors.orangeLight,
  },
  toggleText: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  toggleTextActive: {
    fontFamily: "InstrumentSans-Bold",
    color: Colors.orange,
  },
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
  spacer: { flex: 1, minHeight: 24 },
  errorHint: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 13,
    color: Colors.error,
    textAlign: "center",
    marginBottom: 8,
  },
  cta: { marginTop: 12 },
  backButton: { alignSelf: "center", paddingTop: 16 },
  backText: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 15,
    color: Colors.textSecondary,
  },
});
