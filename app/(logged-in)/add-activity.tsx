import ScreenHeader from "@/components/ui/ScreenHeader";
import type { ActivityDetailStepRef } from "@/components/activity/ActivityDetailStepRef";
import ActivityDetailStepSwitch from "@/components/activity/ActivityDetailStepSwitch";
import ActivityTypeStep from "@/components/activity/ActivityTypeStep";
import MatchScheduleTaskModal from "@/components/activity/MatchScheduleTaskModal";
import CoCareReadOnlyNotice from "@/components/coCare/CoCareReadOnlyNotice";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import PetNavAvatar from "@/components/ui/PetNavAvatar";
import { addActivityNavTitle } from "@/constants/activityWizardTitles";
import { Colors } from "@/theme/colors";
import {
  useLogExerciseMutation,
  useLogFoodMutation,
  useLogMaintenanceMutation,
  useLogMedicationMutation,
  useLogPottyMutation,
  useLogTrainingMutation,
  useLogWeighInMutation,
} from "@/hooks/mutations/useLogActivityMutation";
import { useSetActivePetMutation } from "@/hooks/mutations/useSetActivePetMutation";
import {
  usePetsQuery,
  useScheduleDayQuery,
  useToggleScheduleItemMutation,
} from "@/hooks/queries";
import { useCanShowAds } from "@/hooks/useCanShowAds";
import { useCanPerformAction } from "@/hooks/useCanPerformAction";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useLocalCalendarYmd } from "@/hooks/useLocalCalendarYmd";
import { useActivityFormStore } from "@/stores/activityFormStore";
import { usePetStore } from "@/stores/petStore";
import type { ActivityType, PetScheduleItem } from "@/types/database";
import { foodActivityFormForPet } from "@/utils/foodActivityMerge";
import {
  discardPreloadedInterstitial,
  preloadNonProInterstitial,
  showNonProInterstitialThen,
} from "@/lib/showNonProInterstitial";
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
  BackHandler,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { KeyboardAwareScrollView, type KeyboardAwareScrollViewRef } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "@/screen-styles/add-activity.styles";

const SAVE_LABEL = "Save";
const CONTINUE_LABEL = "Continue";

/** Categories that may have matching schedule slots for the day. */
const SCHEDULE_MATCH_TYPES = new Set<ActivityType>([
  "exercise",
  "food",
  "medication",
  "potty",
]);

/** Deep-link from screens like weight history that skip the type picker. */
function lockedActivityTypeFromParam(
  raw: string | string[] | undefined,
): ActivityType | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "weigh_in" ? "weigh_in" : null;
}

export default function AddActivityScreen() {
  const router = useRouter();
  const { type: typeParam, petId: rawPetIdParam } = useLocalSearchParams<{
    type?: string;
    petId?: string;
  }>();
  const lockedType = lockedActivityTypeFromParam(typeParam);
  const petIdParam = Array.isArray(rawPetIdParam)
    ? rawPetIdParam[0]
    : rawPetIdParam;
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const scrollRef = useRef<KeyboardAwareScrollViewRef | null>(null);
  const stepRef = useRef<ActivityDetailStepRef | null>(null);
  /** Covers network save + interstitial so Save stays locked after mutations settle. */
  const [isCompleting, setIsCompleting] = useState(false);
  const [matchModalVisible, setMatchModalVisible] = useState(false);
  const [matchModalItems, setMatchModalItems] = useState<PetScheduleItem[]>(
    [],
  );
  const [completingMatchId, setCompletingMatchId] = useState<string | null>(
    null,
  );

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
  const weighInForm = useActivityFormStore((s) => s.weighInForm);

  const activePetId = usePetStore((s) => s.activePetId);
  const setActivePetMutation = useSetActivePetMutation();
  const { data: allPets } = usePetsQuery();
  const canShowAds = useCanShowAds();
  const todayYmd = useLocalCalendarYmd();

  const resolvedPetId = useMemo(() => {
    if (petIdParam && (allPets ?? []).some((p) => p.id === petIdParam)) {
      return petIdParam;
    }
    if (activePetId && (allPets ?? []).some((p) => p.id === activePetId)) {
      return activePetId;
    }
    return (allPets ?? [])[0]?.id ?? null;
  }, [activePetId, allPets, petIdParam]);

  const primaryPetForLog = useMemo(() => {
    if (!resolvedPetId || !(allPets ?? []).length) return null;
    return (allPets ?? []).find((p) => p.id === resolvedPetId) ?? null;
  }, [resolvedPetId, allPets]);

  const canLogActivities = useCanPerformAction(
    resolvedPetId,
    "can_log_activities",
  );

  const { data: scheduleItems } = useScheduleDayQuery(resolvedPetId, todayYmd);
  const toggleScheduleItem = useToggleScheduleItemMutation();

  const exerciseMut = useLogExerciseMutation();
  const foodMut = useLogFoodMutation();
  const medMut = useLogMedicationMutation();
  const trainingMut = useLogTrainingMutation(resolvedPetId);
  const pottyMut = useLogPottyMutation(resolvedPetId);
  const maintenanceMut = useLogMaintenanceMutation(resolvedPetId);
  const weighInMut = useLogWeighInMutation(resolvedPetId);

  const effectiveType = activityType ?? lockedType;
  const showTypeStep = step === "type" && !lockedType;
  const scrollKey = `${step}-${effectiveType ?? "none"}`;

  useLayoutEffect(() => {
    reset();
    if (lockedType) {
      selectType(lockedType);
      setActivityOccurredAt(null);
      setStep("details");
    }
    return () => reset();
  }, [reset, lockedType, selectType, setActivityOccurredAt, setStep]);

  /** Apply ?petId= once when opening from a pet-specific screen. */
  const appliedPetParamRef = useRef(false);
  useEffect(() => {
    if (appliedPetParamRef.current) return;
    if (!(allPets ?? []).length) return;
    appliedPetParamRef.current = true;
    if (petIdParam && (allPets ?? []).some((p) => p.id === petIdParam)) {
      if (usePetStore.getState().activePetId !== petIdParam) {
        setActivePetMutation.mutate(petIdParam);
      }
    }
  }, [allPets, petIdParam, setActivePetMutation]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [scrollKey]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (isCompleting) return true;
      if (step === "details" && !lockedType) {
        setStep("type");
        return true;
      }
      reset();
      router.back();
      return true;
    });
    return () => sub.remove();
  }, [step, setStep, reset, router, isCompleting, lockedType]);

  /** Preload interstitial on the details step so it can show right after save. */
  useEffect(() => {
    if (step !== "details") {
      discardPreloadedInterstitial();
      return;
    }
    if (!canShowAds) {
      discardPreloadedInterstitial();
      return;
    }
    preloadNonProInterstitial();
    return () => {
      discardPreloadedInterstitial();
    };
  }, [step, canShowAds]);

  const goBack = useCallback(() => {
    if (isCompleting) return;
    if (step === "details" && !lockedType) {
      setStep("type");
    } else {
      reset();
      router.back();
    }
  }, [step, setStep, reset, router, isCompleting, lockedType]);

  /**
   * Activity rows are already persisted when this runs. Ad presentation / dismiss /
   * app kill must not affect that — we only navigate after the interstitial attempt.
   */
  const finish = useCallback(async () => {
    const go = () => {
      reset();
      router.back();
    };
    if (!canShowAds) {
      go();
      return;
    }
    await showNonProInterstitialThen(go);
  }, [canShowAds, reset, router]);

  const cancelDetails = useCallback(() => {
    if (isCompleting) return;
    reset();
    router.back();
  }, [reset, router, isCompleting]);

  const proceedToDetails = useCallback(() => {
    setActivityOccurredAt(null);
    setStep("details");
  }, [setActivityOccurredAt, setStep]);

  const uncompletedScheduleForType = useCallback(
    (type: ActivityType): PetScheduleItem[] => {
      return (scheduleItems ?? []).filter(
        (item) => !item.completed_at && item.activity_type === type,
      );
    },
    [scheduleItems],
  );

  const handleContinueFromType = useCallback(() => {
    if (!activityType || isCompleting) return;

    if (SCHEDULE_MATCH_TYPES.has(activityType)) {
      const matches = uncompletedScheduleForType(activityType);
      if (matches.length > 0) {
        setMatchModalItems(matches);
        setCompletingMatchId(null);
        setMatchModalVisible(true);
        return;
      }
    }

    proceedToDetails();
  }, [
    activityType,
    isCompleting,
    uncompletedScheduleForType,
    proceedToDetails,
  ]);

  const closeMatchModal = useCallback(() => {
    if (completingMatchId || isCompleting) return;
    setMatchModalVisible(false);
    setMatchModalItems([]);
  }, [completingMatchId, isCompleting]);

  const handleLogNewTaskFromModal = useCallback(() => {
    if (completingMatchId || isCompleting) return;
    setMatchModalVisible(false);
    setMatchModalItems([]);
    proceedToDetails();
  }, [completingMatchId, isCompleting, proceedToDetails]);

  const handleSelectMatchedScheduleTask = useCallback(
    (item: PetScheduleItem) => {
      if (completingMatchId || isCompleting) return;
      setCompletingMatchId(item.id);
      toggleScheduleItem.mutate(
        { item, completed: true },
        {
          onError: () => {
            setCompletingMatchId(null);
          },
        },
      );
      setMatchModalVisible(false);
      setMatchModalItems([]);
      setIsCompleting(true);
      void finish().catch(() => {
        setIsCompleting(false);
        setCompletingMatchId(null);
      });
    },
    [completingMatchId, isCompleting, toggleScheduleItem, finish],
  );

  const runSaveThenFinish = useCallback(
    async (persist: () => Promise<void>) => {
      if (isCompleting) return;
      setIsCompleting(true);
      try {
        // Persist first so closing the app during the ad cannot lose the log.
        await persist();
        await finish();
      } catch (error) {
        setIsCompleting(false);
        throw error;
      }
    },
    [finish, isCompleting],
  );

  const saveExercise = useCallback(async () => {
    if (!activePetId) return;
    await runSaveThenFinish(async () => {
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
    });
  }, [
    exerciseMut,
    exerciseForm,
    exerciseExtraPetIds,
    activePetId,
    runSaveThenFinish,
  ]);

  const saveFood = useCallback(async () => {
    if (!activePetId) return;
    await runSaveThenFinish(async () => {
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
    });
  }, [foodMut, foodForm, foodExtraRows, activePetId, runSaveThenFinish]);

  const saveMed = useCallback(async () => {
    if (!activePetId) return;
    await runSaveThenFinish(async () => {
      const loggedAtIso =
        useActivityFormStore.getState().activityOccurredAt?.toISOString() ??
        new Date().toISOString();
      const ids = [...new Set([activePetId, ...medicationExtraPetIds])];
      for (const petId of ids) {
        await medMut.mutateAsync({ petId, form: medForm, loggedAtIso });
      }
    });
  }, [
    medMut,
    medForm,
    medicationExtraPetIds,
    activePetId,
    runSaveThenFinish,
  ]);

  const saveTraining = useCallback(async () => {
    if (!activePetId) return;
    await runSaveThenFinish(async () => {
      const loggedAtIso =
        useActivityFormStore.getState().activityOccurredAt?.toISOString() ??
        new Date().toISOString();
      await trainingMut.mutateAsync({
        form: trainingForm,
        loggedAtIso,
      });
    });
  }, [trainingMut, trainingForm, activePetId, runSaveThenFinish]);

  const savePotty = useCallback(async () => {
    if (!activePetId) return;
    await runSaveThenFinish(async () => {
      const loggedAtIso =
        useActivityFormStore.getState().activityOccurredAt?.toISOString() ??
        new Date().toISOString();
      await pottyMut.mutateAsync({
        form: pottyForm,
        loggedAtIso,
      });
    });
  }, [pottyMut, pottyForm, activePetId, runSaveThenFinish]);

  const saveMaintenance = useCallback(async () => {
    if (!activePetId) return;
    await runSaveThenFinish(async () => {
      const loggedAtIso =
        useActivityFormStore.getState().activityOccurredAt?.toISOString() ??
        new Date().toISOString();
      await maintenanceMut.mutateAsync({
        form: maintenanceForm,
        loggedAtIso,
      });
    });
  }, [maintenanceMut, maintenanceForm, activePetId, runSaveThenFinish]);

  const saveWeighIn = useCallback(async () => {
    if (!resolvedPetId) return;
    await runSaveThenFinish(async () => {
      const loggedAtIso =
        useActivityFormStore.getState().activityOccurredAt?.toISOString() ??
        new Date().toISOString();
      await weighInMut.mutateAsync({
        form: weighInForm,
        loggedAtIso,
      });
    });
  }, [weighInMut, weighInForm, resolvedPetId, runSaveThenFinish]);

  const saving =
    isCompleting ||
    exerciseMut.isPending ||
    foodMut.isPending ||
    medMut.isPending ||
    trainingMut.isPending ||
    pottyMut.isPending ||
    maintenanceMut.isPending ||
    weighInMut.isPending;

  const navTitle = addActivityNavTitle(
    lockedType ? "details" : step,
    effectiveType,
  );

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
        <ScreenHeader
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
      <ScreenHeader
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
        {showTypeStep ? (
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
                onPress={handleContinueFromType}
                disabled={!activityType || isCompleting}
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
                activityType={effectiveType}
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
                onSaveWeighIn={saveWeighIn}
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

      <MatchScheduleTaskModal
        visible={matchModalVisible}
        petName={primaryPetForLog?.name ?? "your pet"}
        petType={primaryPetForLog?.pet_type}
        items={matchModalItems}
        completingItemId={completingMatchId}
        onSelectItem={handleSelectMatchedScheduleTask}
        onLogNewTask={handleLogNewTaskFromModal}
        onClose={closeMatchModal}
      />
    </View>
  );
}
