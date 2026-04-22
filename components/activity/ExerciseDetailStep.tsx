import type { ActivityDetailStepRef } from "@/components/activity/ActivityDetailStepRef";
import ActivityOccurredTimeRow from "@/components/activity/ActivityOccurredTimeRow";
import AlsoLogForPetsSection from "@/components/activity/AlsoLogForPetsSection";
import DropdownSelect from "@/components/onboarding/DropdownSelect";
import FormInput from "@/components/onboarding/FormInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { usePetsQuery } from "@/hooks/queries";
import { isPetActiveForDashboard } from "@/utils/petParticipation";
import { useActivityFormStore } from "@/stores/activityFormStore";
import { usePetStore } from "@/stores/petStore";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const EXERCISE_TYPES = ["Walk", "Run", "Dog Park", "Home Playtime", "Other"];

type Props = {
  onSave: () => Promise<void>;
  onBack: () => void;
  /** @default "Save" */
  saveLabel?: string;
  embeddedInScreen?: boolean;
  /** When embedded, hide the primary save button (e.g. parent renders it with delete). */
  hideEmbeddedSave?: boolean;
  /** “Also log for” extra pets (add flow only; edit is a single activity). */
  showBatchPets?: boolean;
};

const ExerciseDetailStep = forwardRef<ActivityDetailStepRef, Props>(
  function ExerciseDetailStep(
    {
      onSave,
      onBack,
      saveLabel = "Save",
      embeddedInScreen = false,
      hideEmbeddedSave = false,
      showBatchPets = true,
    },
    ref,
  ) {
  const form = useActivityFormStore((s) => s.exerciseForm);
  const update = useActivityFormStore((s) => s.updateExercise);
  const exerciseExtraPetIds = useActivityFormStore(
    (s) => s.exerciseExtraPetIds,
  );
  const addExerciseExtraPetId = useActivityFormStore(
    (s) => s.addExerciseExtraPetId,
  );
  const removeExerciseExtraPetId = useActivityFormStore(
    (s) => s.removeExerciseExtraPetId,
  );
  const activePetId = usePetStore((s) => s.activePetId);
  const { data: allPets } = usePetsQuery();
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const petNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of allPets ?? []) {
      m.set(p.id, p.name?.trim() || "Pet");
    }
    return m;
  }, [allPets]);

  const selectableExercisePets = useMemo(() => {
    const taken = new Set<string>([
      activePetId ?? "",
      ...exerciseExtraPetIds,
    ]);
    return (allPets ?? []).filter(
      (p) => isPetActiveForDashboard(p) && !taken.has(p.id),
    );
  }, [allPets, activePetId, exerciseExtraPetIds]);

  const isValid =
    form.label.trim().length > 0 &&
    form.exerciseType !== "" &&
    (form.exerciseType !== "Other" ||
      form.customExerciseType.trim().length > 0) &&
    (form.durationHours.trim() !== "" || form.durationMinutes.trim() !== "");

  const handleSave = useCallback(async () => {
    if (!isValid) {
      setAttempted(true);
      return;
    }
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  }, [isValid, onSave]);

  useImperativeHandle(
    ref,
    () => ({
      submit: () => {
        void handleSave();
      },
    }),
    [handleSave],
  );

  const fieldLabelStyle = embeddedInScreen
    ? styles.fieldLabelScreen
    : styles.fieldLabel;
  const blockSpacing = embeddedInScreen ? styles.spacingScreen : styles.spacing;

  const exerciseTypeError = attempted && !form.exerciseType;
  const durationError =
    attempted &&
    !form.durationHours.trim() &&
    !form.durationMinutes.trim();
  const customTypeError =
    attempted &&
    form.exerciseType === "Other" &&
    !form.customExerciseType.trim();

  return (
    <View style={embeddedInScreen ? styles.containerEmbedded : styles.container}>
      {!embeddedInScreen ? (
        <Text style={styles.title}>Edit Exercise Details</Text>
      ) : null}

      <FormInput
        label="Label"
        required
        placeholder="Morning walk, afternoon hike…"
        value={form.label}
        onChangeText={(v) => update({ label: v })}
        containerStyle={blockSpacing}
        error={attempted && !form.label.trim()}
      />

      <Text style={fieldLabelStyle}>Exercise type *</Text>
      <View style={{ zIndex: 80, marginBottom: 12 }}>
        <DropdownSelect
          placeholder="Select type"
          value={form.exerciseType}
          options={EXERCISE_TYPES}
          onSelect={(v) => update({ exerciseType: v })}
        />
      </View>

      {form.exerciseType === "Other" && (
        <FormInput
          placeholder="Custom exercise type"
          value={form.customExerciseType}
          onChangeText={(v) => update({ customExerciseType: v })}
          containerStyle={blockSpacing}
          error={attempted && !form.customExerciseType.trim()}
        />
      )}

      <Text style={fieldLabelStyle}>Duration *</Text>
      <View style={styles.row}>
        <FormInput
          placeholder="Hours"
          value={form.durationHours}
          onChangeText={(v) => update({ durationHours: v })}
          keyboardType="numeric"
          containerStyle={styles.halfInput}
          error={
            attempted &&
            !form.durationHours.trim() &&
            !form.durationMinutes.trim()
          }
        />
        <FormInput
          placeholder="Minutes"
          value={form.durationMinutes}
          onChangeText={(v) => update({ durationMinutes: v })}
          keyboardType="numeric"
          containerStyle={styles.halfInput}
          error={
            attempted &&
            !form.durationHours.trim() &&
            !form.durationMinutes.trim()
          }
        />
      </View>

      <FormInput
        label="Distance"
        placeholder="Miles"
        value={form.distanceMiles}
        onChangeText={(v) => update({ distanceMiles: v })}
        keyboardType="numeric"
        containerStyle={blockSpacing}
      />

      <FormInput
        label="Location"
        placeholder="Park name or address"
        value={form.location}
        onChangeText={(v) => update({ location: v })}
        containerStyle={blockSpacing}
      />

      <ActivityOccurredTimeRow containerStyle={blockSpacing} />
      <FormInput
        label="Notes"
        placeholder="Any notes about this exercise"
        value={form.notes}
        onChangeText={(v) => update({ notes: v })}
        multiline
        containerStyle={blockSpacing}
      />

      {showBatchPets ? (
        <AlsoLogForPetsSection
          hint="Same details for each pet. Add companions who did this activity too."
          extraPetIds={exerciseExtraPetIds}
          selectablePets={selectableExercisePets}
          petNameById={petNameById}
          onAddPet={addExerciseExtraPetId}
          onRemovePet={removeExerciseExtraPetId}
          fieldLabelStyle={fieldLabelStyle}
        />
      ) : null}

      {!embeddedInScreen || !hideEmbeddedSave ? (
        <View style={embeddedInScreen ? styles.spacerEmbedded : styles.spacer} />
      ) : null}

      {attempted && !isValid && (
        <Text style={styles.errorHint}>Please fill in all required fields</Text>
      )}

      {(!embeddedInScreen || !hideEmbeddedSave) && (
        <OrangeButton
          onPress={handleSave}
          loading={saving}
          style={embeddedInScreen ? styles.ctaScreen : styles.cta}
        >
          {saveLabel}
        </OrangeButton>
      )}

      {!embeddedInScreen ? (
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      ) : null}
    </View>
  );
  },
);

export default ExerciseDetailStep;

const styles = StyleSheet.create({
  container: { flex: 1 },
  containerEmbedded: { width: "100%" },
  title: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 26,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 20,
  },
  fieldLabel: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  fieldLabelScreen: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  fieldLabelError: {
    color: Colors.error,
  },
  spacing: { marginBottom: 12 },
  spacingScreen: { marginBottom: 16 },
  row: { flexDirection: "row", gap: 12, marginBottom: 12 },
  halfInput: { flex: 1 },
  spacer: { flex: 1, minHeight: 24 },
  spacerEmbedded: { height: 8 },
  errorHint: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 13,
    color: Colors.error,
    textAlign: "center",
    marginBottom: 8,
  },
  cta: { marginTop: 12 },
  ctaScreen: { marginTop: 8 },
  backButton: { alignSelf: "center", paddingTop: 16 },
  backText: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 15,
    color: Colors.textSecondary,
  },
});
