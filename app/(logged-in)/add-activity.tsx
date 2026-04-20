import type { ActivityDetailStepRef } from "@/components/activity/ActivityDetailStepRef";
import ActivityTypeStep from "@/components/activity/ActivityTypeStep";
import ExerciseDetailStep from "@/components/activity/ExerciseDetailStep";
import FoodDetailStep from "@/components/activity/FoodDetailStep";
import MedicationDetailStep from "@/components/activity/MedicationDetailStep";
import PottyDetailStep from "@/components/activity/PottyDetailStep";
import TrainingDetailStep from "@/components/activity/TrainingDetailStep";
import CoCareReadOnlyNotice from "@/components/coCare/CoCareReadOnlyNotice";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import PetNavAvatar from "@/components/ui/PetNavAvatar";
import { Colors } from "@/constants/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import {
  useLogExerciseMutation,
  useLogFoodMutation,
  useLogMedicationMutation,
  useLogPottyMutation,
  useLogTrainingMutation,
} from "@/hooks/mutations/useLogActivityMutation";
import { usePetsQuery } from "@/hooks/queries";
import { useCanPerformAction } from "@/hooks/useCanPerformAction";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { foodActivityFormForPet } from "@/lib/foodActivityMerge";
import { useActivityFormStore } from "@/stores/activityFormStore";
import { usePetStore } from "@/stores/petStore";
import type { ActivityType } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SAVE_LABEL = "Save";
const CONTINUE_LABEL = "Continue";

function addActivityNavTitle(
  step: "type" | "details",
  activityType: ActivityType | null,
): string {
  if (step === "type") return "Log activity";
  switch (activityType) {
    case "exercise":
      return "Add exercise";
    case "food":
      return "Add meal";
    case "medication":
      return "Add medication";
    case "training":
      return "Add training";
    case "potty":
      return "Log potty";
    default:
      return "Log activity";
  }
}

export default function AddActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const scrollRef = useRef<ScrollView | null>(null);
  const stepRef = useRef<ActivityDetailStepRef | null>(null);

  const step = useActivityFormStore((s) => s.step);
  const activityType = useActivityFormStore((s) => s.activityType);
  const selectType = useActivityFormStore((s) => s.selectType);
  const setStep = useActivityFormStore((s) => s.setStep);
  const setActivityOccurredAt = useActivityFormStore(
    (s) => s.setActivityOccurredAt,
  );
  const reset = useActivityFormStore((s) => s.reset);

  const exerciseForm = useActivityFormStore((s) => s.exerciseForm);
  const foodForm = useActivityFormStore((s) => s.foodForm);
  const foodExtraRows = useActivityFormStore((s) => s.foodExtraRows);
  const exerciseExtraPetIds = useActivityFormStore(
    (s) => s.exerciseExtraPetIds,
  );
  const medicationExtraPetIds = useActivityFormStore(
    (s) => s.medicationExtraPetIds,
  );
  const medForm = useActivityFormStore((s) => s.medicationForm);
  const trainingForm = useActivityFormStore((s) => s.trainingForm);
  const pottyForm = useActivityFormStore((s) => s.pottyForm);

  const activePetId = usePetStore((s) => s.activePetId);
  const { data: allPets } = usePetsQuery();

  const resolvedPetId = useMemo(() => {
    if (activePetId && (allPets ?? []).some((p) => p.id === activePetId)) {
      return activePetId;
    }
    return (allPets ?? [])[0]?.id ?? null;
  }, [activePetId, allPets]);

  const canLogActivities = useCanPerformAction(
    resolvedPetId,
    "can_log_activities",
  );

  const exerciseMut = useLogExerciseMutation();
  const foodMut = useLogFoodMutation();
  const medMut = useLogMedicationMutation();
  const trainingMut = useLogTrainingMutation(activePetId);
  const pottyMut = useLogPottyMutation(activePetId);

  const scrollKey = `${step}-${activityType ?? "none"}`;

  useEffect(() => {
    reset();
    return () => reset();
  }, [reset]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [scrollKey]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (step === "details") {
        setStep("type");
        return true;
      }
      reset();
      router.back();
      return true;
    });
    return () => sub.remove();
  }, [step, setStep, reset, router]);

  const goBack = useCallback(() => {
    if (step === "details") {
      setStep("type");
    } else {
      reset();
      router.back();
    }
  }, [step, setStep, reset, router]);

  const finish = useCallback(() => {
    reset();
    router.back();
  }, [reset, router]);

  const cancelDetails = useCallback(() => {
    reset();
    router.back();
  }, [reset, router]);

  const saveExercise = useCallback(async () => {
    if (!activePetId) return;
    const loggedAtIso =
      useActivityFormStore.getState().activityOccurredAt?.toISOString() ??
      new Date().toISOString();
    const ids = [...new Set([activePetId, ...exerciseExtraPetIds])];
    for (const petId of ids) {
      await exerciseMut.mutateAsync({
        petId,
        form: exerciseForm,
        loggedAtIso,
      });
    }
    finish();
  }, [exerciseMut, exerciseForm, exerciseExtraPetIds, activePetId, finish]);

  const saveFood = useCallback(async () => {
    if (!activePetId) return;
    const loggedAtIso =
      useActivityFormStore.getState().activityOccurredAt?.toISOString() ??
      new Date().toISOString();
    await foodMut.mutateAsync({
      petId: activePetId,
      form: foodForm,
      loggedAtIso,
    });
    for (const row of foodExtraRows) {
      const { petId, ...petFields } = row;
      await foodMut.mutateAsync({
        petId,
        form: foodActivityFormForPet(foodForm, petFields),
        loggedAtIso,
      });
    }
    finish();
  }, [foodMut, foodForm, foodExtraRows, activePetId, finish]);

  const saveMed = useCallback(async () => {
    if (!activePetId) return;
    const loggedAtIso =
      useActivityFormStore.getState().activityOccurredAt?.toISOString() ??
      new Date().toISOString();
    const ids = [...new Set([activePetId, ...medicationExtraPetIds])];
    for (const petId of ids) {
      await medMut.mutateAsync({ petId, form: medForm, loggedAtIso });
    }
    finish();
  }, [medMut, medForm, medicationExtraPetIds, activePetId, finish]);

  const saveTraining = useCallback(async () => {
    if (!activePetId) return;
    const loggedAtIso =
      useActivityFormStore.getState().activityOccurredAt?.toISOString() ??
      new Date().toISOString();
    await trainingMut.mutateAsync({
      form: trainingForm,
      loggedAtIso,
    });
    finish();
  }, [trainingMut, trainingForm, activePetId, finish]);

  const savePotty = useCallback(async () => {
    if (!activePetId) return;
    const loggedAtIso =
      useActivityFormStore.getState().activityOccurredAt?.toISOString() ??
      new Date().toISOString();
    await pottyMut.mutateAsync({
      form: pottyForm,
      loggedAtIso,
    });
    finish();
  }, [pottyMut, pottyForm, activePetId, finish]);

  const saving =
    exerciseMut.isPending ||
    foodMut.isPending ||
    medMut.isPending ||
    trainingMut.isPending ||
    pottyMut.isPending;

  const navTitle = addActivityNavTitle(step, activityType);

  const scrollContentMinHeight = useMemo(() => {
    const topChrome = insets.top + 8 + 56 + 8 + 4;
    return Math.max(windowHeight - topChrome - insets.bottom, 240);
  }, [insets.top, insets.bottom, windowHeight]);

  if (!(allPets ?? []).length) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.blockedHint}>
          Add a pet before logging activity.
        </Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.blockedBack}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (resolvedPetId && canLogActivities === undefined) {
    return (
      <View
        style={[styles.screen, styles.centeredFull, { paddingTop: insets.top }]}
      >
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (resolvedPetId && canLogActivities === false) {
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
          <Text style={styles.navTitle} numberOfLines={1}>
            Log activity
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
          <Text style={styles.blockedLead}>
            Logging activity requires permission from the primary caretaker. Ask
            them to update co-care settings if you should be able to log
            activities for this pet.
          </Text>
        </ScrollView>
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
          {navTitle}
        </Text>
        <PetNavAvatar accessibilityLabelPrefix="Logging activity for" />
      </View>

      <KeyboardAwareScrollView
        ref={scrollRef}
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
        {step === "type" ? (
          <View
            style={[styles.scrollInner, { minHeight: scrollContentMinHeight }]}
          >
            <View>
              <ActivityTypeStep selected={activityType} onSelect={selectType} />
            </View>

            <View style={[styles.actionsBlock, styles.actionsAfterTypeGrid]}>
              <OrangeButton
                onPress={() => {
                  if (activityType) {
                    setActivityOccurredAt(null);
                    setStep("details");
                  }
                }}
                disabled={!activityType}
                style={styles.saveBtn}
              >
                {CONTINUE_LABEL}
              </OrangeButton>
              <Pressable
                style={({ pressed }) => [
                  styles.cancelBtn,
                  pressed && styles.cancelBtnPressed,
                ]}
                onPress={goBack}
                accessibilityRole="button"
                accessibilityLabel="Cancel and go back"
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
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
                />
              ) : activityType === "food" ? (
                <FoodDetailStep
                  ref={stepRef}
                  onSave={saveFood}
                  onBack={goBack}
                  saveLabel={SAVE_LABEL}
                  embeddedInScreen
                  hideEmbeddedSave
                />
              ) : activityType === "medication" ? (
                <MedicationDetailStep
                  ref={stepRef}
                  onSave={saveMed}
                  onBack={goBack}
                  saveLabel={SAVE_LABEL}
                  embeddedInScreen
                  hideEmbeddedSave
                />
              ) : activityType === "training" ? (
                <TrainingDetailStep
                  ref={stepRef}
                  onSave={saveTraining}
                  onBack={goBack}
                  saveLabel={SAVE_LABEL}
                  embeddedInScreen
                  hideEmbeddedSave
                />
              ) : activityType === "potty" ? (
                <PottyDetailStep
                  ref={stepRef}
                  onSave={savePotty}
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
                style={styles.saveBtn}
              >
                {SAVE_LABEL}
              </OrangeButton>
              <Pressable
                style={({ pressed }) => [
                  styles.cancelBtn,
                  pressed && styles.cancelBtnPressed,
                ]}
                onPress={cancelDetails}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel="Cancel and go back"
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
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
  petContextHint: {
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
  /** Breathing room above Continue when the type grid sits just above the actions. */
  actionsAfterTypeGrid: {
    marginTop: 24,
  },
  saveBtn: {
    marginTop: 0,
  },
  cancelBtn: {
    marginTop: 16,
    alignItems: "center",
  },
  cancelBtnPressed: {
    opacity: 0.75,
  },
  cancelText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  centeredFull: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  navSpacer: { width: 28 },
  blockedHint: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    color: Colors.textSecondary,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  blockedBack: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.orange,
    paddingHorizontal: 24,
  },
  blockedLead: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginTop: 8,
  },
});
