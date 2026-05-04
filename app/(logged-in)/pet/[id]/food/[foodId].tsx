import FormInput from "@/components/onboarding/FormInput";
import MealPortionEditorModal from "@/components/pet/MealPortionEditorModal";
import PetFoodMealScheduleSection from "@/components/petScreens/food/PetFoodMealScheduleSection";
import PetFoodNavHeader from "@/components/petScreens/food/PetFoodNavHeader";
import PetFoodNoPermissionAddView from "@/components/petScreens/food/PetFoodNoPermissionAddView";
import PetFoodReadOnlyView from "@/components/petScreens/food/PetFoodReadOnlyView";
import PetFoodTreatSection from "@/components/petScreens/food/PetFoodTreatSection";
import PetFoodTypeToggle from "@/components/petScreens/food/PetFoodTypeToggle";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { foodBrandInputPlaceholder } from "@/constants/petFoodFormConstants";
import {
  useInsertPetFoodMutation,
  usePetDetailsQuery,
  useUpdatePetFoodMutation,
} from "@/hooks/queries";
import { useCanPerformAction } from "@/hooks/useCanPerformAction";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useProGateNavigation } from "@/hooks/useProGateNavigation";
import {
  buildPetFoodPayload,
  isPetFoodFormValid,
} from "@/utils/petFoodFormHelpers";
import { createPetFoodPortionHandlers } from "@/utils/petFoodPortionEditor";
import {
  deriveMealPortionsFromLegacy,
  isTreatFood,
  portionsForPetFood,
  type MealPortionDraft,
} from "@/utils/petFood";
import { pgTimeToDate } from "@/utils/petFoodTime";
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
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "@/screen-styles/pet/[id]/food/[foodId].styles";

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

  const isValid = useMemo(
    () => isPetFoodFormValid({ brand, isTreat, mealsPerDay, mealPortions }),
    [brand, isTreat, mealsPerDay, mealPortions],
  );

  const handleSave = useCallback(async () => {
    if (!petId) return;
    setAttempted(true);
    if (!isValid) return;
    const payload = buildPetFoodPayload({
      brand,
      isTreat,
      portionSize,
      portionUnit,
      mealsPerDay,
      notes,
      mealPortions,
    });
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
    brand,
    isTreat,
    portionSize,
    portionUnit,
    mealsPerDay,
    notes,
    mealPortions,
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
      <PetFoodNoPermissionAddView
        topInset={insets.top}
        bottomPadding={scrollInsetBottom + 32}
        onBack={() => router.back()}
      />
    );
  }

  if (!isNew && existing && canManageFood === false) {
    return (
      <PetFoodReadOnlyView
        existing={existing}
        topInset={insets.top}
        bottomPadding={scrollInsetBottom + 32}
        onBack={() => router.back()}
      />
    );
  }

  const saving = insertMut.isPending || updateMut.isPending;
  const petNameForTitle = details.name?.trim() || "your pet";
  const foodNavTitle = isNew
    ? `Add food for ${petNameForTitle}`
    : `Edit food for ${petNameForTitle}`;

  const {
    openAddPortion,
    openEditPortion,
    removePortion,
    savePortionFromModal,
  } = createPetFoodPortionHandlers({
    mealPortions,
    setMealPortions,
    editingPortionIndex,
    setEditingPortionIndex,
    setPortionEditorDraft,
    setPortionModalVisible,
    setPortionModalTitle,
  });

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <PetFoodNavHeader title={foodNavTitle} onBack={() => router.back()} />

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
              placeholder={foodBrandInputPlaceholder(details?.pet_type ?? null)}
              containerStyle={styles.field}
              error={attempted && !brand.trim()}
            />

            <PetFoodTypeToggle
              isTreat={isTreat}
              onChange={(nextIsTreat) => {
                if (nextIsTreat === isTreat) return;
                setIsTreat(nextIsTreat);
                setMealPortions([]);
                if (nextIsTreat) {
                  setPortionSize("");
                  setMealsPerDay("1");
                }
              }}
            />

            {isTreat ? (
              <PetFoodTreatSection
                portionSize={portionSize}
                setPortionSize={setPortionSize}
                portionUnit={portionUnit}
                setPortionUnit={setPortionUnit}
                mealsPerDay={mealsPerDay}
                setMealsPerDay={setMealsPerDay}
                attempted={attempted}
                isValid={isValid}
              />
            ) : (
              <PetFoodMealScheduleSection
                mealPortions={mealPortions}
                petNameForTitle={petNameForTitle}
                onAddPortion={openAddPortion}
                onEditPortion={openEditPortion}
                onRemovePortion={removePortion}
              />
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
