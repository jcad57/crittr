import ExerciseDetailStep from "@/components/activity/ExerciseDetailStep";
import FoodDetailStep from "@/components/activity/FoodDetailStep";
import MedicationDetailStep from "@/components/activity/MedicationDetailStep";
import VetVisitDetailStep from "@/components/activity/VetVisitDetailStep";
import OnboardingCard from "@/components/onboarding/OnboardingCard";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import {
  useDeleteActivityMutation,
  useUpdateExerciseActivityMutation,
  useUpdateFoodActivityMutation,
  useUpdateMedicationActivityMutation,
  useUpdateVetVisitActivityMutation,
} from "@/hooks/mutations/useManageActivityMutation";
import { useActivityQuery, usePetDetailsQuery } from "@/hooks/queries";
import { useActivityFormStore } from "@/stores/activityFormStore";
import { usePetStore } from "@/stores/petStore";
import type { PetWithDetails } from "@/types/database";
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
  View,
} from "react-native";

const SAVE_LABEL = "Save changes";

export default function ManageActivityItemScreen() {
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

  const scrollKey = hydrated ? `${activityType}-${activityId}` : "loading";

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.white} />
      </View>
    );
  }

  if (isError || activity == null) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {isError
            ? (error?.message ?? "Could not load activity.")
            : "Activity not found."}
        </Text>
        <Pressable onPress={goBack} style={styles.errorBack}>
          <Text style={styles.errorBackText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (!hydrated) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.white} />
      </View>
    );
  }

  return (
    <OnboardingCard scrollKey={scrollKey}>
      <Text style={styles.timeHint}>Logged {loggedAtLabel}</Text>

      {activityType === "exercise" ? (
        <ExerciseDetailStep
          onSave={saveExercise}
          onBack={goBack}
          saveLabel={SAVE_LABEL}
        />
      ) : activityType === "food" ? (
        <FoodDetailStep
          onSave={saveFood}
          onBack={goBack}
          saveLabel={SAVE_LABEL}
        />
      ) : activityType === "medication" ? (
        <MedicationDetailStep
          onSave={saveMed}
          onBack={goBack}
          saveLabel={SAVE_LABEL}
        />
      ) : activityType === "vet_visit" ? (
        <VetVisitDetailStep
          onSave={saveVet}
          onBack={goBack}
          saveLabel={SAVE_LABEL}
        />
      ) : null}

      <Pressable
        style={styles.deleteBtn}
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
    </OnboardingCard>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.orange,
    padding: 24,
  },
  errorText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.white,
    textAlign: "center",
  },
  errorBack: { marginTop: 16, padding: 12 },
  errorBackText: {
    fontFamily: Font.uiBold,
    fontSize: 15,
    color: Colors.white,
    textDecorationLine: "underline",
  },
  timeHint: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 8,
  },
  deleteBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 20,
    marginTop: 8,
  },
  deleteText: {
    fontFamily: Font.uiBold,
    fontSize: 15,
    color: Colors.error,
  },
});
