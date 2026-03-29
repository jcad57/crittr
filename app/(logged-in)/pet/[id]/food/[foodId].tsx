import FormInput from "@/components/onboarding/FormInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import {
  useInsertPetFoodMutation,
  usePetDetailsQuery,
  useUpdatePetFoodMutation,
} from "@/hooks/queries";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { isTreatFood } from "@/lib/petFood";
import type { UpsertPetFoodInput } from "@/services/petFoods";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PORTION_UNITS = ["Cups", "Ounces", "Piece(s)"] as const;
const TIMES_QUICK = ["1", "2", "3", "4", "5", "6", "7", "8"];

export default function EditPetFoodScreen() {
  const { id: rawPetId, foodId: rawFoodId } = useLocalSearchParams<{
    id: string;
    foodId: string;
  }>();
  const petId = Array.isArray(rawPetId) ? rawPetId[0] : rawPetId;
  const foodIdParam = Array.isArray(rawFoodId) ? rawFoodId[0] : rawFoodId;
  const isNew = foodIdParam === "new";

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();

  const { data: details, isLoading } = usePetDetailsQuery(petId ?? null);
  const insertMut = useInsertPetFoodMutation(petId ?? "");
  const updateMut = useUpdatePetFoodMutation(petId ?? "");

  const existing = !isNew
    ? details?.foods.find((f) => f.id === foodIdParam)
    : undefined;

  const [brand, setBrand] = useState("");
  const [portionSize, setPortionSize] = useState("");
  const [portionUnit, setPortionUnit] = useState<string>("Cups");
  const [mealsPerDay, setMealsPerDay] = useState("1");
  const [isTreat, setIsTreat] = useState(false);
  const [notes, setNotes] = useState("");
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (isNew || !existing) return;
    setBrand(existing.brand?.trim() ?? "");
    setPortionSize(existing.portion_size?.trim() ?? "");
    setPortionUnit(existing.portion_unit?.trim() || "Cups");
    const n = existing.meals_per_day;
    setMealsPerDay(n != null && n >= 1 ? String(n) : "1");
    setIsTreat(isTreatFood(existing));
    setNotes(existing.notes?.trim() ?? "");
  }, [isNew, existing]);

  const isValid =
    brand.trim().length > 0 &&
    mealsPerDay.trim() !== "" &&
    Number.isFinite(parseInt(mealsPerDay.trim(), 10)) &&
    parseInt(mealsPerDay.trim(), 10) >= 1;

  const buildPayload = useCallback((): UpsertPetFoodInput => {
    const times = parseInt(mealsPerDay.trim(), 10);
    const mealsPerDayVal =
      Number.isFinite(times) && times >= 1 ? Math.min(8, times) : 1;
    return {
      brand: brand.trim(),
      portion_size: portionSize.trim() || null,
      portion_unit: portionUnit.trim() || null,
      meals_per_day: mealsPerDayVal,
      is_treat: isTreat,
      notes: notes.trim() || null,
    };
  }, [brand, portionSize, portionUnit, mealsPerDay, isTreat, notes]);

  const handleSave = useCallback(async () => {
    if (!petId) return;
    setAttempted(true);
    if (!isValid) return;
    const payload = buildPayload();
    try {
      if (isNew) {
        await insertMut.mutateAsync(payload);
      } else if (foodIdParam) {
        await updateMut.mutateAsync({ foodId: foodIdParam, input: payload });
      }
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Couldn't save", msg);
    }
  }, [
    petId,
    isValid,
    isNew,
    foodIdParam,
    buildPayload,
    insertMut,
    updateMut,
    router,
  ]);

  if (isLoading && !details) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (!details || !petId) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.missing}>Pet not found.</Text>
      </View>
    );
  }

  if (!isNew && !existing) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.missing}>Food not found.</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const saving = insertMut.isPending || updateMut.isPending;
  const petNameForTitle = details.name?.trim() || "your pet";
  const foodNavTitle = isNew
    ? `Add food for ${petNameForTitle}`
    : `Edit food for ${petNameForTitle}`;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={28}
            color={Colors.textPrimary}
          />
        </Pressable>
        <Text style={styles.navTitle} numberOfLines={2}>
          {foodNavTitle}
        </Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.body,
          { paddingBottom: scrollInsetBottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>
          {isNew
            ? "Add a meal or treat for this pet."
            : "Update brand, portion, and how often it’s given."}
        </Text>

        <FormInput
          label="Brand / name *"
          value={brand}
          onChangeText={setBrand}
          placeholder="e.g. Purina Pro Plan"
          containerStyle={styles.field}
          error={attempted && !brand.trim()}
        />

        <Text style={styles.fieldLabel}>Type</Text>
        <View style={styles.row2}>
          <Pressable
            style={[
              styles.typeToggle,
              !isTreat && styles.typeToggleActive,
            ]}
            onPress={() => setIsTreat(false)}
          >
            <Text
              style={[
                styles.typeToggleText,
                !isTreat && styles.typeToggleTextActive,
              ]}
            >
              Meal
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.typeToggle,
              isTreat && styles.typeToggleActiveTreat,
            ]}
            onPress={() => setIsTreat(true)}
          >
            <Text
              style={[
                styles.typeToggleText,
                isTreat && styles.typeToggleTextActiveTreat,
              ]}
            >
              Treat
            </Text>
          </Pressable>
        </View>

        <Text style={styles.fieldLabel}>Portion</Text>
        <View style={styles.row2}>
          <FormInput
            placeholder="Amount"
            value={portionSize}
            onChangeText={setPortionSize}
            keyboardType="decimal-pad"
            containerStyle={styles.portionAmt}
          />
          <View style={styles.portionUnits}>
            {PORTION_UNITS.map((unit, i) => (
              <Pressable
                key={unit}
                style={[
                  styles.unitChip,
                  i < PORTION_UNITS.length - 1 && styles.unitChipBorder,
                  portionUnit === unit && styles.unitChipActive,
                ]}
                onPress={() => setPortionUnit(unit)}
              >
                <Text
                  style={[
                    styles.unitChipText,
                    portionUnit === unit && styles.unitChipTextActive,
                  ]}
                >
                  {unit}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text
          style={[
            styles.fieldLabel,
            attempted && !isValid && styles.fieldLabelError,
          ]}
        >
          Times per day *
        </Text>
        <View style={styles.timesRow}>
          {TIMES_QUICK.map((t) => (
            <Pressable
              key={t}
              style={[
                styles.timeChip,
                mealsPerDay === t && styles.timeChipActive,
              ]}
              onPress={() => setMealsPerDay(t)}
            >
              <Text
                style={[
                  styles.timeChipText,
                  mealsPerDay === t && styles.timeChipTextActive,
                ]}
              >
                {t}×
              </Text>
            </Pressable>
          ))}
        </View>

        <FormInput
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Any feeding notes"
          multiline
          containerStyle={styles.field}
        />

        {attempted && !isValid ? (
          <Text style={styles.formError}>
            Please enter a brand and a valid times-per-day (1–8).
          </Text>
        ) : null}

        <OrangeButton
          onPress={handleSave}
          disabled={saving}
          style={styles.saveBtn}
        >
          {saving ? "Saving…" : isNew ? "Add food" : "Save changes"}
        </OrangeButton>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  navTitle: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: 18,
    lineHeight: 24,
    color: Colors.textPrimary,
    textAlign: "center",
    marginHorizontal: 8,
  },
  navSpacer: { width: 28 },
  scroll: { flex: 1 },
  body: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  lead: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  fieldLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  fieldLabelError: {
    color: Colors.error,
  },
  field: {
    marginBottom: 16,
  },
  row2: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
    alignItems: "stretch",
  },
  typeToggle: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
  },
  typeToggleActive: {
    backgroundColor: Colors.orangeLight,
    borderColor: Colors.orange,
  },
  typeToggleActiveTreat: {
    backgroundColor: "#FFF0DD",
    borderColor: "#C2410C",
  },
  typeToggleText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  typeToggleTextActive: {
    color: Colors.orange,
  },
  typeToggleTextActiveTreat: {
    color: "#C2410C",
  },
  portionAmt: {
    width: 100,
    marginBottom: 0,
  },
  portionUnits: {
    flex: 1,
    flexDirection: "row",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.gray200,
    height: 50,
  },
  unitChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
  },
  unitChipBorder: {
    borderRightWidth: 1,
    borderRightColor: Colors.gray200,
  },
  unitChipActive: {
    backgroundColor: Colors.orangeLight,
  },
  unitChipText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  unitChipTextActive: {
    color: Colors.orange,
  },
  timesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  timeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  timeChipActive: {
    backgroundColor: Colors.orangeLight,
    borderColor: Colors.orange,
  },
  timeChipText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  timeChipTextActive: {
    color: Colors.orange,
  },
  formError: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.error,
    marginBottom: 8,
    textAlign: "center",
  },
  saveBtn: {
    marginTop: 8,
  },
  missing: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  backLink: {
    marginTop: 16,
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.orange,
    textAlign: "center",
  },
});
