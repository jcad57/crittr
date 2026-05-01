import type { ActivityDetailStepRef } from "@/components/activity/ActivityDetailStepRef";
import ActivityDetailStepSwitch from "@/components/activity/ActivityDetailStepSwitch";
import ActivityTypeStep from "@/components/activity/ActivityTypeStep";
import ActivityWizardChrome from "@/components/activity/ActivityWizardChrome";
import CoCareReadOnlyNotice from "@/components/coCare/CoCareReadOnlyNotice";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import PetNavAvatar from "@/components/ui/PetNavAvatar";
import { addActivityNavTitle } from "@/constants/activityWizardTitles";
import { Colors } from "@/constants/colors";
import {
  useLogExerciseMutation,
  useLogFoodMutation,
  useLogMaintenanceMutation,
  useLogMedicationMutation,
  useLogPottyMutation,
  useLogTrainingMutation,
} from "@/hooks/mutations/useLogActivityMutation";
import { usePetsQuery, useProfileQuery } from "@/hooks/queries";
import { useIsCrittrPro } from "@/hooks/useIsCrittrPro";
import { useCanPerformAction } from "@/hooks/useCanPerformAction";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useActivityFormStore } from "@/stores/activityFormStore";
import { usePetStore } from "@/stores/petStore";
import { foodActivityFormForPet } from "@/utils/foodActivityMerge";
import { showNonProInterstitialThen } from "@/lib/showNonProInterstitial";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "@/screen-styles/add-activity.styles";

const SAVE_LABEL = "Save";
const CONTINUE_LABEL = "Continue";

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
  const maintenanceForm = useActivityFormStore((s) => s.maintenanceForm);

  const activePetId = usePetStore((s) => s.activePetId);
  const { data: allPets } = usePetsQuery();
  const { data: profile, isPending: profilePending, isPlaceholderData: profilePlaceholder } =
    useProfileQuery();
  const isPro = useIsCrittrPro(profile);

  const resolvedPetId = useMemo(() => {
    if (activePetId && (allPets ?? []).some((p) => p.id === activePetId)) {
      return activePetId;
    }
    return (allPets ?? [])[0]?.id ?? null;
  }, [activePetId, allPets]);

  const primaryPetForLog = useMemo(() => {
    if (!resolvedPetId || !(allPets ?? []).length) return null;
    return (allPets ?? []).find((p) => p.id === resolvedPetId) ?? null;
  }, [resolvedPetId, allPets]);

  const canLogActivities = useCanPerformAction(
    resolvedPetId,
    "can_log_activities",
  );

  const exerciseMut = useLogExerciseMutation();
  const foodMut = useLogFoodMutation();
  const medMut = useLogMedicationMutation();
  const trainingMut = useLogTrainingMutation(activePetId);
  const pottyMut = useLogPottyMutation(activePetId);
  const maintenanceMut = useLogMaintenanceMutation(activePetId);

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

  const finish = useCallback(async () => {
    const go = () => {
      reset();
      router.back();
    };
    if (profilePending || profilePlaceholder) {
      go();
      return;
    }
    if (isPro) {
      go();
      return;
    }
    await showNonProInterstitialThen(go);
  }, [
    isPro,
    profilePending,
    profilePlaceholder,
    reset,
    router,
  ]);

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
    await finish();
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
    await finish();
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
    await finish();
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
    await finish();
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
    await finish();
  }, [pottyMut, pottyForm, activePetId, finish]);

  const saveMaintenance = useCallback(async () => {
    if (!activePetId) return;
    const loggedAtIso =
      useActivityFormStore.getState().activityOccurredAt?.toISOString() ??
      new Date().toISOString();
    await maintenanceMut.mutateAsync({
      form: maintenanceForm,
      loggedAtIso,
    });
    await finish();
  }, [maintenanceMut, maintenanceForm, activePetId, finish]);

  const saving =
    exerciseMut.isPending ||
    foodMut.isPending ||
    medMut.isPending ||
    trainingMut.isPending ||
    pottyMut.isPending ||
    maintenanceMut.isPending;

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
        <ActivityWizardChrome
          title="Log activity"
          onBack={() => router.back()}
          right={
            <PetNavAvatar
              displayPet={primaryPetForLog}
              accessibilityLabelPrefix="Logging activity for"
            />
          }
        />
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
      <ActivityWizardChrome
        title={navTitle}
        onBack={goBack}
        right={
          <PetNavAvatar
            displayPet={primaryPetForLog}
            accessibilityLabelPrefix="Logging activity for"
          />
        }
      />

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
              <ActivityTypeStep
                petType={primaryPetForLog?.pet_type}
                selected={activityType}
                onSelect={selectType}
              />
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
              <ActivityDetailStepSwitch
                activityType={activityType}
                stepRef={stepRef}
                saveLabel={SAVE_LABEL}
                petType={primaryPetForLog?.pet_type ?? null}
                onBack={goBack}
                onSaveExercise={saveExercise}
                onSaveFood={saveFood}
                onSaveMedication={saveMed}
                onSaveTraining={saveTraining}
                onSavePotty={savePotty}
                onSaveMaintenance={saveMaintenance}
              />
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
