import CoCareReadOnlyNotice from "@/components/coCare/CoCareReadOnlyNotice";
import { ReadOnlyFieldRow } from "@/components/coCare/ReadOnlyFieldRow";
import PetEnergyLevelToggle from "@/components/onboarding/petInfo/PetEnergyLevelToggle";
import ExercisePlanEditorModal from "@/components/pet/ExercisePlanEditorModal";
import ExercisePlansSection from "@/components/pet/ExercisePlansSection";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { shouldShowExerciseField } from "@/constants/petInfo";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import {
  usePetDetailsQuery,
  useUpdatePetExerciseRequirementsMutation,
} from "@/hooks/queries";
import { useCanPerformAction } from "@/hooks/useCanPerformAction";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useUserDateTimePrefs } from "@/hooks/useUserDateTimePrefs";
import type { PetFormData } from "@/types/database";
import { getErrorMessage } from "@/utils/errorMessage";
import {
  defaultExercisePlanDraft,
  formatExercisePlanSubline,
  type ExercisePlanDraft,
} from "@/utils/exercisePlans";
import { formatEnergyLabel } from "@/utils/petDisplay";
import { dateToPgTime, pgTimeToDate } from "@/utils/petFoodTime";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ExerciseRequirementsScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const petId = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const { timeDisplay } = useUserDateTimePrefs();

  const scrollContentMinHeight = useMemo(() => {
    const topChrome = insets.top + 8 + 56 + 8 + 4;
    return Math.max(windowHeight - topChrome - insets.bottom, 240);
  }, [insets.top, insets.bottom, windowHeight]);

  const { data: details, isLoading } = usePetDetailsQuery(petId ?? null);
  const canEditProfile = useCanPerformAction(petId, "can_edit_pet_profile");
  const updateMut = useUpdatePetExerciseRequirementsMutation(petId ?? "");

  const [energyLevel, setEnergyLevel] = useState<PetFormData["energyLevel"]>(
    "",
  );
  const [plans, setPlans] = useState<ExercisePlanDraft[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("Add activity");
  const [editorDraft, setEditorDraft] = useState<ExercisePlanDraft | null>(
    null,
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!details?.id) return;
    setEnergyLevel(
      details.energy_level === "low" ||
        details.energy_level === "medium" ||
        details.energy_level === "high"
        ? details.energy_level
        : "",
    );
    setPlans(
      (details.exercise_plans ?? []).map((p) => ({
        key: p.id,
        label: p.label,
        daysOfWeek: [...(p.days_of_week ?? [])],
        scheduledTime: pgTimeToDate(p.scheduled_time),
        notes: p.notes?.trim() ?? "",
      })),
    );
  }, [details?.id, details?.exercise_plans, details?.energy_level]);

  const showActivities = details
    ? shouldShowExerciseField(details.pet_type ?? "")
    : false;

  const energyOk =
    energyLevel === "low" ||
    energyLevel === "medium" ||
    energyLevel === "high";

  const handleSave = useCallback(async () => {
    if (!details || !petId) return;
    setAttempted(true);
    if (!energyOk) return;
    if (showActivities && plans.length < 1) return;

    try {
      await updateMut.mutateAsync({
        energy_level: energyLevel as "low" | "medium" | "high",
        exercise_plans: showActivities
          ? plans.map((p) => ({
              label: p.label.trim(),
              days_of_week: [...p.daysOfWeek].sort((a, b) => a - b),
              scheduled_time: dateToPgTime(p.scheduledTime),
              notes: p.notes.trim() || null,
            }))
          : [],
      });
      router.back();
    } catch (e) {
      Alert.alert("Couldn't save", getErrorMessage(e) || "Please try again.");
    }
  }, [
    details,
    petId,
    energyOk,
    energyLevel,
    showActivities,
    plans,
    updateMut,
    router,
  ]);

  const energyError = attempted && !energyOk;
  const activitiesError = attempted && showActivities && plans.length < 1;

  const openAdd = () => {
    setModalTitle("Add activity");
    setEditingIndex(null);
    setEditorDraft(defaultExercisePlanDraft());
    setModalVisible(true);
  };

  const openEdit = (index: number) => {
    const row = plans[index];
    if (!row) return;
    setModalTitle("Edit activity");
    setEditingIndex(index);
    setEditorDraft({
      ...row,
      daysOfWeek: [...row.daysOfWeek],
      scheduledTime: new Date(row.scheduledTime.getTime()),
    });
    setModalVisible(true);
  };

  const removePlan = (index: number) => {
    setPlans((rows) => rows.filter((_, i) => i !== index));
  };

  const saveFromModal = (draft: ExercisePlanDraft) => {
    if (editingIndex !== null) {
      setPlans((rows) =>
        rows.map((r, i) => (i === editingIndex ? draft : r)),
      );
    } else {
      setPlans((rows) => [...rows, draft]);
    }
    setModalVisible(false);
    setEditingIndex(null);
    setEditorDraft(null);
  };

  if (isLoading || !details || !petId) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (canEditProfile === undefined) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (canEditProfile === false) {
    const showEx = shouldShowExerciseField(details.pet_type ?? "");
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <View style={styles.nav}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.navBack}>&lt; Back</Text>
          </TouchableOpacity>
          <Text
            style={styles.navTitle}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
          >
            Exercise requirements
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
            label="Energy level"
            value={formatEnergyLabel(details.energy_level)}
          />
          {showEx ? (
            (details.exercise_plans ?? []).length > 0 ? (
              (details.exercise_plans ?? []).map((p) => (
                <ReadOnlyFieldRow
                  key={p.id}
                  label={p.label}
                  value={formatExercisePlanSubline(p, timeDisplay)}
                />
              ))
            ) : (
              <ReadOnlyFieldRow label="Activities" value="—" />
            )
          ) : (
            <ReadOnlyFieldRow
              label="Activities"
              value="Not tracked for this species"
            />
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.navBack}>&lt; Back</Text>
        </TouchableOpacity>
        <Text
          style={styles.navTitle}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
        >
          Exercise requirements
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
        <View
          style={[styles.scrollInner, { minHeight: scrollContentMinHeight }]}
        >
          <View>
            <Text style={styles.lead}>
              Energy and planned activities power daily progress and the
              schedule tab. Update them anytime.
            </Text>

            <PetEnergyLevelToggle
              energyLevel={energyLevel}
              onChange={(level) => setEnergyLevel(level)}
              error={energyError}
            />

            {showActivities ? (
              <ExercisePlansSection
                plans={plans}
                onAdd={openAdd}
                onEdit={openEdit}
                onRemove={removePlan}
                addButtonError={activitiesError}
                helperText="Each activity needs a label, days of the week, and a time."
              />
            ) : (
              <Text style={styles.helperMuted}>
                Scheduled activities aren&apos;t tracked for this species.
              </Text>
            )}

            {attempted && (!energyOk || activitiesError) ? (
              <Text style={styles.formError}>
                {!energyOk
                  ? "Select an energy level."
                  : "Add at least one activity."}
              </Text>
            ) : null}
          </View>

          <View style={styles.actionsBlock}>
            <OrangeButton
              onPress={handleSave}
              loading={updateMut.isPending}
              style={styles.saveBtn}
            >
              Save
            </OrangeButton>
          </View>
        </View>
      </KeyboardAwareScrollView>

      <ExercisePlanEditorModal
        visible={modalVisible}
        title={modalTitle}
        initial={editorDraft}
        onClose={() => {
          setModalVisible(false);
          setEditingIndex(null);
          setEditorDraft(null);
        }}
        onSave={saveFromModal}
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
    justifyContent: "center",
    alignItems: "center",
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  navBack: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.orange,
    minWidth: 72,
  },
  navTitle: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: MANAGE_SCREEN_TITLE_SIZE,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  navSpacer: { minWidth: 72 },
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
  helperMuted: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  formError: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.error,
    marginBottom: 8,
  },
  saveBtn: {
    marginTop: 0,
  },
});
