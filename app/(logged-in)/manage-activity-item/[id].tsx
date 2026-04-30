import type { ActivityDetailStepRef } from "@/components/activity/ActivityDetailStepRef";
import ActivityDetailStepSwitch from "@/components/activity/ActivityDetailStepSwitch";
import ActivityWizardChrome from "@/components/activity/ActivityWizardChrome";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { manageActivityNavTitle } from "@/constants/activityWizardTitles";
import { Colors } from "@/constants/colors";
import {
  useDeleteActivityMutation,
  useUpdateExerciseActivityMutation,
  useUpdateFoodActivityMutation,
  useUpdateMedicationActivityMutation,
  useUpdatePottyActivityMutation,
  useUpdateTrainingActivityMutation,
  useUpdateVetVisitActivityMutation,
} from "@/hooks/mutations/useManageActivityMutation";
import { useSetActivePetMutation } from "@/hooks/mutations/useSetActivePetMutation";
import { useActivityQuery, usePetDetailsQuery } from "@/hooks/queries";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useActivityFormStore } from "@/stores/activityFormStore";
import { useAuthStore } from "@/stores/authStore";
import { usePetStore } from "@/stores/petStore";
import type { PetWithDetails } from "@/types/database";
import { confirmActivityDeletion } from "@/utils/manageActivityFormHelpers";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
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
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "@/screen-styles/manage-activity-item/[id].styles";

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

  useEffect(() => {
    if (!activity?.vet_visit_id || !activity.pet_id) return;
    router.replace(
      `/(logged-in)/pet/${activity.pet_id}/vet-visits/${activity.vet_visit_id}` as Href,
    );
  }, [activity?.vet_visit_id, activity?.pet_id, activity, router]);

  const activePetId = usePetStore((s) => s.activePetId);
  const { mutate: setActivePetMutate } = useSetActivePetMutation();
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
  const trainingForm = useActivityFormStore((s) => s.trainingForm);
  const pottyForm = useActivityFormStore((s) => s.pottyForm);
  const activityType = useActivityFormStore((s) => s.activityType);
  const userId = useAuthStore((s) => s.session?.user?.id);

  const petId = activity?.pet_id ?? null;

  const updateEx = useUpdateExerciseActivityMutation(petId);
  const updateFood = useUpdateFoodActivityMutation(petId);
  const updateMed = useUpdateMedicationActivityMutation(petId);
  const updateVet = useUpdateVetVisitActivityMutation(petId);
  const updateTraining = useUpdateTrainingActivityMutation(petId);
  const updatePotty = useUpdatePottyActivityMutation(petId);
  const deleteMut = useDeleteActivityMutation(petId);

  const [hydrated, setHydrated] = useState(false);
  const lastHydratedActivityIdRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (!activity) {
      setHydrated(false);
      lastHydratedActivityIdRef.current = null;
      return;
    }

    if (activity.pet_id && activity.pet_id !== activePetId) {
      setActivePetMutate(activity.pet_id);
    }

    if (activity.vet_visit_id) {
      setHydrated(false);
      return;
    }

    const needsPetContext =
      activity.activity_type === "food" ||
      activity.activity_type === "medication";
    if (needsPetContext && activePetId !== activity.pet_id) {
      setHydrated(false);
      return;
    }

    if (
      activity.activity_type === "vet_visit" &&
      !activity.vet_visit_id &&
      !petDetails
    ) {
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
    setActivePetMutate,
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

  const saveTraining = useCallback(async () => {
    if (!activityId) return;
    const loggedAtIso =
      useActivityFormStore.getState().activityOccurredAt?.toISOString();
    await updateTraining.mutateAsync({
      activityId,
      form: trainingForm,
      loggedAtIso,
    });
    finish();
  }, [activityId, updateTraining, trainingForm, finish]);

  const savePotty = useCallback(async () => {
    if (!activityId) return;
    const loggedAtIso =
      useActivityFormStore.getState().activityOccurredAt?.toISOString();
    await updatePotty.mutateAsync({
      activityId,
      form: pottyForm,
      loggedAtIso,
    });
    finish();
  }, [activityId, updatePotty, pottyForm, finish]);

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
    if (!activityId || !activity) return;
    confirmActivityDeletion({
      activity,
      activityId,
      userId,
      deleteActivity: (id) => deleteMut.mutateAsync(id),
      onDeleted: finish,
    });
  }, [activityId, activity, deleteMut, finish, userId]);

  const saving =
    updateEx.isPending ||
    updateFood.isPending ||
    updateMed.isPending ||
    updateVet.isPending ||
    updateTraining.isPending ||
    updatePotty.isPending;
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

  if (activity.vet_visit_id && activity.pet_id) {
    return (
      <View
        style={[styles.screen, styles.centered, { paddingTop: insets.top }]}
      >
        <ActivityIndicator size="large" color={Colors.orange} />
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
      <ActivityWizardChrome
        title={manageActivityNavTitle(activityType)}
        onBack={goBack}
      />

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
            <ActivityDetailStepSwitch
              activityType={activityType}
              stepRef={stepRef}
              saveLabel={SAVE_LABEL}
              showBatchPets={false}
              onBack={goBack}
              onSaveExercise={saveExercise}
              onSaveFood={saveFood}
              onSaveMedication={saveMed}
              onSaveTraining={saveTraining}
              onSavePotty={savePotty}
              onSaveVetVisit={saveVet}
            />
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
