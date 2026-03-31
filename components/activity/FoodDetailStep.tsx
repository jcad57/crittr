import type { ActivityDetailStepRef } from "@/components/activity/ActivityDetailStepRef";
import AlsoLogForPetsSection from "@/components/activity/AlsoLogForPetsSection";
import FoodPetFieldsRow from "@/components/activity/FoodPetFieldsRow";
import DropdownSelect from "@/components/onboarding/DropdownSelect";
import FormInput from "@/components/onboarding/FormInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { usePetDetailsQuery, usePetsQuery } from "@/hooks/queries";
import type { FoodActivityExtraPetRow } from "@/lib/foodActivityMerge";
import { isPetActiveForDashboard } from "@/lib/petParticipation";
import { useActivityFormStore } from "@/stores/activityFormStore";
import { usePetStore } from "@/stores/petStore";
import { FOOD_ACTIVITY_OTHER_ID } from "@/types/database";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

const PORTION_UNITS = ["Cups", "Ounces", "Piece(s)"];

/** Dropdown label for foods not saved on the pet profile (avoids colliding with a brand named "Other"). */
const OTHER_FOOD_DROPDOWN_LABEL = "Other (not listed)";

type Props = {
  onSave: () => Promise<void>;
  onBack: () => void;
  /** @default "Save" */
  saveLabel?: string;
  embeddedInScreen?: boolean;
  hideEmbeddedSave?: boolean;
  showBatchPets?: boolean;
};

const FoodDetailStep = forwardRef<ActivityDetailStepRef, Props>(
  function FoodDetailStep(
    {
      onSave,
      onBack,
      saveLabel = "Save",
      embeddedInScreen = false,
      hideEmbeddedSave = false,
      showBatchPets = true,
    },
    ref,
  ) {
  const form = useActivityFormStore((s) => s.foodForm);
  const update = useActivityFormStore((s) => s.updateFood);
  const foodExtraRows = useActivityFormStore((s) => s.foodExtraRows);
  const addFoodExtraRow = useActivityFormStore((s) => s.addFoodExtraRow);
  const removeFoodExtraRow = useActivityFormStore((s) => s.removeFoodExtraRow);
  const updateFoodExtraRow = useActivityFormStore((s) => s.updateFoodExtraRow);
  const clearFoodExtraRows = useActivityFormStore((s) => s.clearFoodExtraRows);
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const activePetId = usePetStore((s) => s.activePetId);
  const { data: petDetails } = usePetDetailsQuery(activePetId);
  const { data: allPets } = usePetsQuery();

  const petNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of allPets ?? []) {
      m.set(p.id, p.name?.trim() || "Pet");
    }
    return m;
  }, [allPets]);

  const activePetName =
    petDetails?.name?.trim() || petNameById.get(activePetId ?? "") || "Pet";

  const selectablePetsForBatch = useMemo(() => {
    const taken = new Set<string>([
      activePetId ?? "",
      ...foodExtraRows.map((r) => r.petId),
    ]);
    return (allPets ?? []).filter(
      (p) => isPetActiveForDashboard(p) && !taken.has(p.id),
    );
  }, [allPets, activePetId, foodExtraRows]);

  const foodExtraPetIds = useMemo(
    () => foodExtraRows.map((r) => r.petId),
    [foodExtraRows],
  );

  const removeFoodExtraByPetId = useCallback(
    (petId: string) => {
      const idx = foodExtraRows.findIndex((r) => r.petId === petId);
      if (idx >= 0) removeFoodExtraRow(idx);
    },
    [foodExtraRows, removeFoodExtraRow],
  );

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

  const extraRowValid = useCallback(
    (row: FoodActivityExtraPetRow) => {
      const other = row.foodId === FOOD_ACTIVITY_OTHER_ID;
      return (
        row.amount.trim().length > 0 &&
        row.unit.trim().length > 0 &&
        (other ? row.foodBrand.trim().length > 0 : row.foodId.length > 0)
      );
    },
    [],
  );

  const isValid =
    form.label.trim().length > 0 &&
    form.amount.trim().length > 0 &&
    form.unit.trim().length > 0 &&
    (isOtherFood ? form.foodBrand.trim().length > 0 : form.foodId.length > 0) &&
    foodExtraRows.every((row) => extraRowValid(row));

  const foodMissing =
    attempted &&
    (isOtherFood ? !form.foodBrand.trim() : !form.foodId.length);
  const foodDropdownError = attempted && !isOtherFood && !form.foodId.length;
  const unitRowError = attempted && !form.unit.trim();

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

  useImperativeHandle(
    ref,
    () => ({
      submit: () => {
        void handleSave();
      },
    }),
    [handleSave],
  );

  const fieldLabelStyle = embeddedInScreen
    ? styles.fieldLabelScreen
    : styles.fieldLabel;
  const blockSpacing = embeddedInScreen ? styles.spacingScreen : styles.spacing;

  return (
    <View style={embeddedInScreen ? styles.containerEmbedded : styles.container}>
      {!embeddedInScreen ? (
        <Text style={styles.title}>Edit Food Details</Text>
      ) : null}

      <FormInput
        label="Label"
        required
        placeholder="Morning meal, Dinner, Treat time…"
        value={form.label}
        onChangeText={(v) => update({ label: v })}
        containerStyle={blockSpacing}
        error={attempted && !form.label.trim()}
      />

      <Text style={fieldLabelStyle}>Type *</Text>
      <View style={styles.toggleRow}>
        <Pressable
          style={[
            styles.toggle,
            styles.toggleBorder,
            !form.isTreat && styles.toggleActive,
          ]}
          onPress={() => {
            clearFoodExtraRows();
            update({ isTreat: false, foodId: "", foodBrand: "" });
          }}
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
          onPress={() => {
            clearFoodExtraRows();
            update({ isTreat: true, foodId: "", foodBrand: "" });
          }}
        >
          <Text
            style={[styles.toggleText, form.isTreat && styles.toggleTextActive]}
          >
            Treat
          </Text>
        </Pressable>
      </View>

      <Text style={styles.forPetHint}>Food and amount for {activePetName}</Text>
      <Text style={[fieldLabelStyle, foodMissing && styles.fieldLabelError]}>
        Food *
      </Text>
      <View
        style={{
          zIndex: 80,
          marginBottom: embeddedInScreen ? 16 : 12,
        }}
      >
        <DropdownSelect
          placeholder="Select a food"
          value={dropdownDisplayValue}
          options={dropdownLabels}
          error={foodDropdownError}
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
          containerStyle={blockSpacing}
          error={attempted && !form.foodBrand.trim()}
        />
      ) : null}

      <Text
        style={[
          fieldLabelStyle,
          ((attempted && !form.amount.trim()) || unitRowError) &&
            styles.fieldLabelError,
        ]}
      >
        Amount *
      </Text>
      <View style={styles.amountRow}>
        <FormInput
          placeholder="Amt"
          value={form.amount}
          onChangeText={(v) => update({ amount: v })}
          keyboardType="numeric"
          containerStyle={styles.amountInput}
          error={attempted && !form.amount.trim()}
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
        containerStyle={blockSpacing}
      />

      {showBatchPets ? (
        <AlsoLogForPetsSection
          hint="Same label and notes; pick food and amount for each pet."
          extraPetIds={foodExtraPetIds}
          selectablePets={selectablePetsForBatch}
          petNameById={petNameById}
          onAddPet={addFoodExtraRow}
          onRemovePet={removeFoodExtraByPetId}
          fieldLabelStyle={fieldLabelStyle}
        />
      ) : null}

      {showBatchPets
        ? foodExtraRows.map((row, index) => (
            <FoodPetFieldsRow
              key={`${row.petId}-${index}`}
              petName={petNameById.get(row.petId) ?? "Pet"}
              row={row}
              rowIndex={index}
              isTreat={form.isTreat}
              attempted={attempted}
              embeddedInScreen={embeddedInScreen}
              onChange={updateFoodExtraRow}
              onRemove={() => removeFoodExtraRow(index)}
            />
          ))
        : null}

      {!embeddedInScreen || !hideEmbeddedSave ? (
        <View style={embeddedInScreen ? styles.spacerEmbedded : styles.spacer} />
      ) : null}

      {attempted && !isValid && (
        <Text style={styles.errorHint}>Please fill in all required fields</Text>
      )}

      {(!embeddedInScreen || !hideEmbeddedSave) && (
        <OrangeButton
          onPress={handleSave}
          disabled={saving}
          style={embeddedInScreen ? styles.ctaScreen : styles.cta}
        >
          {saving ? <ActivityIndicator color={Colors.white} /> : saveLabel}
        </OrangeButton>
      )}

      {!embeddedInScreen ? (
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      ) : null}
    </View>
  );
  },
);

export default FoodDetailStep;

const styles = StyleSheet.create({
  container: { flex: 1 },
  containerEmbedded: { width: "100%" },
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
  spacer: { flex: 1, minHeight: 24 },
  spacerEmbedded: { height: 8 },
  errorHint: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 13,
    color: Colors.error,
    textAlign: "center",
    marginBottom: 8,
  },
  cta: { marginTop: 12 },
  ctaScreen: { marginTop: 8 },
  backButton: { alignSelf: "center", paddingTop: 16 },
  backText: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 15,
    color: Colors.textSecondary,
  },
  forPetHint: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
});
