import type { ActivityDetailStepRef } from "@/components/activity/ActivityDetailStepRef";
import ExerciseDetailStep from "@/components/activity/ExerciseDetailStep";
import FoodDetailStep from "@/components/activity/FoodDetailStep";
import MedicationDetailStep from "@/components/activity/MedicationDetailStep";
import VetVisitDetailStep from "@/components/activity/VetVisitDetailStep";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import {
  useDeleteActivityMutation,
  useUpdateExerciseActivityMutation,
  useUpdateFoodActivityMutation,
  useUpdateMedicationActivityMutation,
  useUpdateVetVisitActivityMutation,
} from "@/hooks/mutations/useManageActivityMutation";
import { useActivityQuery, usePetDetailsQuery } from "@/hooks/queries";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useActivityFormStore } from "@/stores/activityFormStore";
import { usePetStore } from "@/stores/petStore";
import type { PetWithDetails } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function navTitleForActivityType(t: string | null | undefined): string {
  switch (t) {
    case "exercise":
      return "Edit exercise";
    case "food":
      return "Edit meal";
    case "medication":
      return "Edit medication";
    case "vet_visit":
      return "Edit vet visit";
    default:
      return "Edit activity";
  }
}

const SAVE_LABEL = "Save changes";

export default function ManageActivityItemScreen() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const stepRef = useRef<ActivityDetailStepRef | null>(null);
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const activityId = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();

  const {
    data: activity,
    isLoading,
    isError,
    error,
  } = useActivityQuery(activityId);

  const activePetId = usePetStore((s) => s.activePetId);
  const { data: petDetails } = usePetDetailsQuery(activity?.pet_id ?? null);

  const vetClinic = useMemo(() => {
    const d = petDetails as PetWithDetails | null | undefined;
    return d?.primary_vet_clinic?.trim() ?? null;
  }, [petDetails]);

  const hydrateFromActivity = useActivityFormStore(
    (s) => s.hydrateFromActivity,
  );
  const reset = useActivityFormStore((s) => s.reset);

  const exerciseForm = useActivityFormStore((s) => s.exerciseForm);
  const foodForm = useActivityFormStore((s) => s.foodForm);
  const medForm = useActivityFormStore((s) => s.medicationForm);
  const vetForm = useActivityFormStore((s) => s.vetVisitForm);
  const activityType = useActivityFormStore((s) => s.activityType);

  const petId = activity?.pet_id ?? null;

  const updateEx = useUpdateExerciseActivityMutation(petId);
  const updateFood = useUpdateFoodActivityMutation(petId);
  const updateMed = useUpdateMedicationActivityMutation(petId);
  const updateVet = useUpdateVetVisitActivityMutation(petId);
  const deleteMut = useDeleteActivityMutation(petId);

  const [hydrated, setHydrated] = useState(false);
  const lastHydratedActivityIdRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (!activity) {
      setHydrated(false);
      lastHydratedActivityIdRef.current = null;
      return;
    }

    if (activity.pet_id) {
      usePetStore.getState().setActivePet(activity.pet_id);
    }

    const needsPetContext =
      activity.activity_type === "food" ||
      activity.activity_type === "medication";
    if (needsPetContext && activePetId !== activity.pet_id) {
      setHydrated(false);
      return;
    }

    if (activity.activity_type === "vet_visit" && !petDetails) {
      setHydrated(false);
      return;
    }

    if (lastHydratedActivityIdRef.current !== activity.id) {
      reset();
      lastHydratedActivityIdRef.current = activity.id;
    }

    hydrateFromActivity(activity, { vetClinic });
    setHydrated(true);
  }, [
    activity,
    activePetId,
    petDetails,
    vetClinic,
    hydrateFromActivity,
    reset,
  ]);

  useEffect(() => {
    return () => {
      reset();
      lastHydratedActivityIdRef.current = null;
    };
  }, [reset]);

  const finish = useCallback(() => {
    reset();
    router.back();
  }, [reset, router]);

  const saveExercise = useCallback(async () => {
    if (!activityId) return;
    await updateEx.mutateAsync({ activityId, form: exerciseForm });
    finish();
  }, [activityId, updateEx, exerciseForm, finish]);

  const saveFood = useCallback(async () => {
    if (!activityId) return;
    await updateFood.mutateAsync({ activityId, form: foodForm });
    finish();
  }, [activityId, updateFood, foodForm, finish]);

  const saveMed = useCallback(async () => {
    if (!activityId) return;
    await updateMed.mutateAsync({ activityId, form: medForm });
    finish();
  }, [activityId, updateMed, medForm, finish]);

  const saveVet = useCallback(async () => {
    if (!activityId) return;
    await updateVet.mutateAsync({ activityId, form: vetForm });
    finish();
  }, [activityId, updateVet, vetForm, finish]);

  const goBack = useCallback(() => {
    reset();
    router.back();
  }, [reset, router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      goBack();
      return true;
    });
    return () => sub.remove();
  }, [goBack]);

  const confirmDelete = useCallback(() => {
    if (!activityId) return;
    Alert.alert("Delete activity?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMut.mutateAsync(activityId);
            finish();
          } catch {
            Alert.alert("Could not delete", "Please try again.");
          }
        },
      },
    ]);
  }, [activityId, deleteMut, finish]);

  const saving =
    updateEx.isPending ||
    updateFood.isPending ||
    updateMed.isPending ||
    updateVet.isPending;
  const busy = saving || deleteMut.isPending;

  const loggedAtLabel = activity
    ? new Date(activity.logged_at).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  /** Fills scroll viewport when form is short so Save/Delete sit at the bottom. */
  const scrollContentMinHeight = useMemo(() => {
    const topChrome = insets.top + 8 + 56 + (loggedAtLabel ? 28 : 0) + 8 + 4;
    return Math.max(windowHeight - topChrome - insets.bottom, 240);
  }, [insets.top, insets.bottom, loggedAtLabel, windowHeight]);

  if (isLoading) {
    return (
      <View
        style={[styles.screen, styles.centered, { paddingTop: insets.top }]}
      >
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (isError || activity == null) {
    return (
      <View
        style={[
          styles.screen,
          styles.centered,
          { paddingTop: insets.top + 24 },
        ]}
      >
        <Text style={styles.errorTextMuted}>
          {isError
            ? (error?.message ?? "Could not load activity.")
            : "Activity not found."}
        </Text>
        <Pressable onPress={goBack}>
          <Text style={styles.backLink}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (!hydrated) {
    return (
      <View
        style={[styles.screen, styles.centered, { paddingTop: insets.top }]}
      >
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.nav}>
        <Pressable onPress={goBack} hitSlop={8}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={28}
            color={Colors.textPrimary}
          />
        </Pressable>
        <Text style={styles.navTitle} numberOfLines={1}>
          {navTitleForActivityType(activityType)}
        </Text>
        <View style={styles.navSpacer} />
      </View>

      {loggedAtLabel ? (
        <Text style={styles.loggedAtHint}>{loggedAtLabel}</Text>
      ) : null}

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
        <View
          style={[styles.scrollInner, { minHeight: scrollContentMinHeight }]}
        >
          <View>
            {activityType === "exercise" ? (
              <ExerciseDetailStep
                ref={stepRef}
                onSave={saveExercise}
                onBack={goBack}
                saveLabel={SAVE_LABEL}
                embeddedInScreen
                hideEmbeddedSave
                showBatchPets={false}
              />
            ) : activityType === "food" ? (
              <FoodDetailStep
                ref={stepRef}
                onSave={saveFood}
                onBack={goBack}
                saveLabel={SAVE_LABEL}
                embeddedInScreen
                hideEmbeddedSave
                showBatchPets={false}
              />
            ) : activityType === "medication" ? (
              <MedicationDetailStep
                ref={stepRef}
                onSave={saveMed}
                onBack={goBack}
                saveLabel={SAVE_LABEL}
                embeddedInScreen
                hideEmbeddedSave
                showBatchPets={false}
              />
            ) : activityType === "vet_visit" ? (
              <VetVisitDetailStep
                ref={stepRef}
                onSave={saveVet}
                onBack={goBack}
                saveLabel={SAVE_LABEL}
                embeddedInScreen
                hideEmbeddedSave
              />
            ) : null}
          </View>

          <View style={styles.actionsBlock}>
            <OrangeButton
              onPress={() => stepRef.current?.submit()}
              loading={saving}
              disabled={deleteMut.isPending}
              style={styles.saveBtn}
            >
              {SAVE_LABEL}
            </OrangeButton>

            <Pressable
              style={({ pressed }) => [
                styles.deleteBtn,
                pressed && styles.deleteBtnPressed,
              ]}
              onPress={confirmDelete}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Delete activity"
            >
              {deleteMut.isPending ? (
                <ActivityIndicator color={Colors.error} />
              ) : (
                <Text style={styles.deleteText}>Delete activity</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
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
    color: Colors.textPrimary,
    textAlign: "center",
    marginHorizontal: 8,
  },
  navSpacer: { width: 28 },
  loggedAtHint: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
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
    paddingTop: 4,
  },
  actionsBlock: {
    paddingTop: 8,
  },
  saveBtn: {
    marginTop: 0,
  },
  errorTextMuted: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 8,
  },
  backLink: {
    marginTop: 12,
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.orange,
    textAlign: "center",
  },
  deleteBtn: {
    marginTop: 16,
    alignItems: "center",
  },
  deleteBtnPressed: {
    opacity: 0.75,
  },
  deleteText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.error,
  },
});
