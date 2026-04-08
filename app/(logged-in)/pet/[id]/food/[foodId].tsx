import CoCareReadOnlyNotice from "@/components/coCare/CoCareReadOnlyNotice";
import { ReadOnlyFieldRow } from "@/components/coCare/ReadOnlyFieldRow";
import FormInput from "@/components/onboarding/FormInput";
import MealPortionEditorModal from "@/components/pet/MealPortionEditorModal";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import {
  useInsertPetFoodMutation,
  usePetDetailsQuery,
  useUpdatePetFoodMutation,
} from "@/hooks/queries";
import { useCanPerformAction } from "@/hooks/useCanPerformAction";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useProGateNavigation } from "@/hooks/useProGateNavigation";
import {
  deriveMealPortionsFromLegacy,
  formatPetFoodPortionSubline,
  isTreatFood,
  portionsForPetFood,
  type MealPortionDraft,
} from "@/lib/petFood";
import { dateToPgTime, pgTimeToDate } from "@/lib/petFoodTime";
import type { UpsertPetFoodInput } from "@/services/petFoods";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
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
  const { height: windowHeight } = useWindowDimensions();
  const scrollInsetBottom = useFloatingNavScrollInset();

  const scrollContentMinHeight = useMemo(() => {
    const topChrome = insets.top + 8 + 56 + 8 + 4;
    return Math.max(windowHeight - topChrome - insets.bottom, 240);
  }, [insets.top, insets.bottom, windowHeight]);

  const { data: details, isLoading } = usePetDetailsQuery(petId ?? null);
  const canManageFood = useCanPerformAction(petId, "can_manage_food");
  const insertMut = useInsertPetFoodMutation(petId ?? "");
  const updateMut = useUpdatePetFoodMutation(petId ?? "");
  const { isPro, isProfileReady, replaceWithUpgrade } = useProGateNavigation();

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
  /** Meal-only: scheduled portions with times. */
  const [mealPortions, setMealPortions] = useState<MealPortionDraft[]>([]);
  const [portionModalVisible, setPortionModalVisible] = useState(false);
  const [portionModalTitle, setPortionModalTitle] = useState("Add a portion");
  const [portionEditorDraft, setPortionEditorDraft] =
    useState<MealPortionDraft | null>(null);
  const [editingPortionIndex, setEditingPortionIndex] = useState<number | null>(
    null,
  );

  useEffect(() => {
    if (isNew || !existing) return;
    setBrand(existing.brand?.trim() ?? "");
    setNotes(existing.notes?.trim() ?? "");
    const treat = isTreatFood(existing);
    setIsTreat(treat);
    if (treat) {
      setPortionSize(existing.portion_size?.trim() ?? "");
      setPortionUnit(existing.portion_unit?.trim() || "Cups");
      const n = existing.meals_per_day;
      setMealsPerDay(n != null && n >= 1 ? String(n) : "1");
      setMealPortions([]);
    } else {
      setPortionSize("");
      setMealsPerDay("1");
      const parsed = portionsForPetFood(existing);
      if (parsed.length > 0) {
        setMealPortions(
          parsed.map((p) => ({
            key: p.id,
            portionSize: p.portion_size?.trim() ?? "",
            portionUnit: p.portion_unit?.trim() || "Cups",
            feedTime: pgTimeToDate(p.feed_time),
          })),
        );
      } else {
        setMealPortions(deriveMealPortionsFromLegacy(existing));
      }
    }
  }, [isNew, existing]);

  const isValid = useMemo(() => {
    if (!brand.trim()) return false;
    if (isTreat) {
      return (
        mealsPerDay.trim() !== "" &&
        Number.isFinite(parseInt(mealsPerDay.trim(), 10)) &&
        parseInt(mealsPerDay.trim(), 10) >= 1
      );
    }
    if (mealPortions.length < 1) return false;
    return mealPortions.every((p) => p.portionSize.trim().length > 0);
  }, [brand, isTreat, mealsPerDay, mealPortions]);

  const buildPayload = useCallback((): UpsertPetFoodInput => {
    if (isTreat) {
      const times = parseInt(mealsPerDay.trim(), 10);
      const mealsPerDayVal =
        Number.isFinite(times) && times >= 1 ? Math.min(8, times) : 1;
      return {
        brand: brand.trim(),
        portion_size: portionSize.trim() || null,
        portion_unit: portionUnit.trim() || null,
        meals_per_day: mealsPerDayVal,
        is_treat: true,
        notes: notes.trim() || null,
        portions: null,
      };
    }
    return {
      brand: brand.trim(),
      portion_size: null,
      portion_unit: null,
      meals_per_day: mealPortions.length,
      is_treat: false,
      notes: notes.trim() || null,
      portions: mealPortions.map((p) => ({
        portion_size: p.portionSize.trim() || null,
        portion_unit: p.portionUnit.trim() || null,
        feed_time: dateToPgTime(p.feedTime),
      })),
    };
  }, [
    brand,
    isTreat,
    portionSize,
    portionUnit,
    mealsPerDay,
    notes,
    mealPortions,
  ]);

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

  useLayoutEffect(() => {
    if (!isNew || !details) return;
    if (canManageFood !== true) return;
    if (!isProfileReady) return;
    if ((details.foods?.length ?? 0) >= 1 && !isPro) {
      replaceWithUpgrade();
    }
  }, [
    isNew,
    details,
    isPro,
    isProfileReady,
    replaceWithUpgrade,
    canManageFood,
  ]);

  if (isLoading && !details) {
    return (
      <View
        style={[styles.screen, styles.centered, { paddingTop: insets.top }]}
      >
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

  if (details && canManageFood === undefined) {
    return (
      <View
        style={[styles.screen, styles.centered, { paddingTop: insets.top }]}
      >
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (isNew && canManageFood === false) {
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
            Add food
          </Text>
          <View style={styles.navSpacer} />
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.body,
            { paddingBottom: scrollInsetBottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <CoCareReadOnlyNotice />
          <Text style={styles.lead}>
            Adding foods requires permission from the primary caretaker.
          </Text>
        </ScrollView>
      </View>
    );
  }

  if (!isNew && existing && canManageFood === false) {
    const treat = isTreatFood(existing);
    const meals =
      existing.meals_per_day != null && existing.meals_per_day >= 1
        ? String(existing.meals_per_day)
        : "—";
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
            Food details
          </Text>
          <View style={styles.navSpacer} />
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.body,
            { paddingBottom: scrollInsetBottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <CoCareReadOnlyNotice />
          <ReadOnlyFieldRow
            label="Brand / name"
            value={existing.brand?.trim() || ""}
          />
          <ReadOnlyFieldRow label="Type" value={treat ? "Treat" : "Meal"} />
          {treat ? (
            <>
              <ReadOnlyFieldRow
                label="Portion"
                value={formatPetFoodPortionSubline(existing)}
              />
              <ReadOnlyFieldRow label="Times per day" value={meals} />
            </>
          ) : (
            <ReadOnlyFieldRow
              label="Feeding schedule"
              value={formatPetFoodPortionSubline(existing)}
            />
          )}
          <ReadOnlyFieldRow
            label="Notes"
            value={existing.notes?.trim() || ""}
          />
        </ScrollView>
      </View>
    );
  }

  const saving = insertMut.isPending || updateMut.isPending;
  const petNameForTitle = details.name?.trim() || "your pet";
  const foodNavTitle = isNew
    ? `Add food for ${petNameForTitle}`
    : `Edit food for ${petNameForTitle}`;

  const openAddPortion = () => {
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    setPortionModalTitle("Add a portion");
    setEditingPortionIndex(null);
    setPortionEditorDraft({
      key: `new-${Date.now()}`,
      portionSize: "",
      portionUnit: "Cups",
      feedTime: d,
    });
    setPortionModalVisible(true);
  };

  const openEditPortion = (index: number) => {
    const row = mealPortions[index];
    if (!row) return;
    setPortionModalTitle("Edit portion");
    setEditingPortionIndex(index);
    setPortionEditorDraft({
      ...row,
      feedTime: new Date(row.feedTime.getTime()),
    });
    setPortionModalVisible(true);
  };

  const removePortion = (index: number) => {
    setMealPortions((rows) => rows.filter((_, i) => i !== index));
  };

  const savePortionFromModal = (draft: MealPortionDraft) => {
    if (editingPortionIndex !== null) {
      setMealPortions((rows) =>
        rows.map((r, i) => (i === editingPortionIndex ? draft : r)),
      );
    } else {
      setMealPortions((rows) => [...rows, draft]);
    }
    setPortionModalVisible(false);
    setEditingPortionIndex(null);
    setPortionEditorDraft(null);
  };

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

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.body,
          styles.scrollContentGrow,
          { paddingBottom: scrollInsetBottom + 32 },
        ]}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={[styles.scrollInner, { minHeight: scrollContentMinHeight }]}
          onPress={Keyboard.dismiss}
        >
          <View>
            <Text style={styles.lead}>
              {isNew
                ? "Add a meal or treat for this pet."
                : isTreat
                  ? "Update brand, portion, and how often it’s given."
                  : "Update brand and each meal portion with its feeding time."}
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
                style={[styles.typeToggle, !isTreat && styles.typeToggleActive]}
                onPress={() => {
                  if (isTreat) {
                    setIsTreat(false);
                    setMealPortions([]);
                  }
                }}
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
                onPress={() => {
                  if (!isTreat) {
                    setIsTreat(true);
                    setMealPortions([]);
                    setPortionSize("");
                    setMealsPerDay("1");
                  }
                }}
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

            {isTreat ? (
              <>
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
              </>
            ) : (
              <>
                <Text style={styles.fieldLabel}>Feeding schedule</Text>
                <Text style={styles.mealHint}>
                  Add multiple portions if you feed your pet multiple times a
                  day. Each includes amount, unit, and the time you usually feed
                  — Pro members get reminders when it's time to feed{" "}
                  {petNameForTitle}!
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
                        onPress={() => openEditPortion(index)}
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
                        onPress={() => removePortion(index)}
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
                  onPress={openAddPortion}
                >
                  <MaterialCommunityIcons
                    name="plus-circle-outline"
                    size={22}
                    color={Colors.orange}
                  />
                  <Text style={styles.addPortionBtnText}>Add a portion</Text>
                </Pressable>
              </>
            )}

            <FormInput
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Any feeding notes"
              multiline
              containerStyle={styles.field}
            />

            {attempted && !isValid ? (
              <Text style={styles.formError}>
                {isTreat
                  ? "Please enter a brand and a valid times-per-day (1–8)."
                  : "Please enter a brand and at least one portion with an amount."}
              </Text>
            ) : null}
          </View>

          <View style={styles.actionsBlock}>
            <OrangeButton
              onPress={handleSave}
              loading={saving}
              style={styles.saveBtn}
            >
              {isNew ? "Add food" : "Save changes"}
            </OrangeButton>
          </View>
        </Pressable>
      </KeyboardAwareScrollView>

      <MealPortionEditorModal
        visible={portionModalVisible}
        title={portionModalTitle}
        initial={portionEditorDraft}
        onClose={() => {
          setPortionModalVisible(false);
          setEditingPortionIndex(null);
          setPortionEditorDraft(null);
        }}
        onSave={savePortionFromModal}
      />
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
    fontSize: MANAGE_SCREEN_TITLE_SIZE,
    lineHeight: 26,
    color: Colors.textPrimary,
    textAlign: "center",
    marginHorizontal: 8,
  },
  navSpacer: { width: 28 },
  scroll: { flex: 1 },
  scrollContentGrow: {
    flexGrow: 1,
  },
  scrollInner: {
    flexGrow: 1,
    justifyContent: "space-between",
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  actionsBlock: {
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
    marginTop: 0,
  },
  mealHint: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 12,
  },
  portionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
    marginBottom: 10,
  },
  portionCardMain: {
    flex: 1,
    minWidth: 0,
  },
  portionCardTitle: {
    fontFamily: Font.uiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  portionCardSub: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  portionCardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  portionIconBtn: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  portionIconBtnPressed: {
    opacity: 0.65,
  },
  addPortionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.orange,
    backgroundColor: Colors.white,
    marginBottom: 16,
  },
  addPortionBtnPressed: {
    opacity: 0.88,
  },
  addPortionBtnText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.orange,
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
