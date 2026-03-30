import type { ActivityDetailStepRef } from "@/components/activity/ActivityDetailStepRef";
import DropdownSelect from "@/components/onboarding/DropdownSelect";
import FormInput from "@/components/onboarding/FormInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { usePetsQuery } from "@/hooks/queries";
import { isPetActiveForDashboard } from "@/lib/petParticipation";
import { useActivityFormStore } from "@/stores/activityFormStore";
import { usePetStore } from "@/stores/petStore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const EXERCISE_TYPES = ["Walk", "Run", "Dog Park", "Home Playtime", "Other"];

type Props = {
  onSave: () => Promise<void>;
  onBack: () => void;
  /** @default "Save" */
  saveLabel?: string;
  embeddedInScreen?: boolean;
  /** When embedded, hide the primary save button (e.g. parent renders it with delete). */
  hideEmbeddedSave?: boolean;
};

const ExerciseDetailStep = forwardRef<ActivityDetailStepRef, Props>(
  function ExerciseDetailStep(
    {
      onSave,
      onBack,
      saveLabel = "Save",
      embeddedInScreen = false,
      hideEmbeddedSave = false,
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
  const [pickPetOpen, setPickPetOpen] = useState(false);
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

      <FormInput
        label="Notes"
        placeholder="Any notes about this exercise"
        value={form.notes}
        onChangeText={(v) => update({ notes: v })}
        multiline
        containerStyle={blockSpacing}
      />

      {selectableExercisePets.length > 0 || exerciseExtraPetIds.length > 0 ? (
        <View style={styles.batchSection}>
          <Text style={fieldLabelStyle}>Also log for</Text>
          <Text style={styles.batchHint}>
            Same details for each pet. Add companions who did this activity
            too.
          </Text>
          <View style={styles.chipRow}>
            {exerciseExtraPetIds.map((id) => (
              <View key={id} style={styles.chip}>
                <Text style={styles.chipText} numberOfLines={1}>
                  {petNameById.get(id) ?? "Pet"}
                </Text>
                <Pressable
                  onPress={() => removeExerciseExtraPetId(id)}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="Remove pet"
                >
                  <MaterialCommunityIcons
                    name="close-circle"
                    size={18}
                    color={Colors.gray500}
                  />
                </Pressable>
              </View>
            ))}
            {selectableExercisePets.length > 0 ? (
              <Pressable
                style={styles.addChip}
                onPress={() => setPickPetOpen(true)}
              >
                <MaterialCommunityIcons
                  name="plus"
                  size={18}
                  color={Colors.orange}
                />
                <Text style={styles.addChipText}>Add pet</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      <Modal
        visible={pickPetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickPetOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setPickPetOpen(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Add pet</Text>
            <ScrollView
              style={styles.modalList}
              keyboardShouldPersistTaps="handled"
            >
              {selectableExercisePets.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.modalRow}
                  onPress={() => {
                    addExerciseExtraPetId(p.id);
                    setPickPetOpen(false);
                  }}
                >
                  <Text style={styles.modalRowText}>{p.name}</Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={22}
                    color={Colors.gray400}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setPickPetOpen(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {!embeddedInScreen || !hideEmbeddedSave ? (
        <View style={embeddedInScreen ? styles.spacerEmbedded : styles.spacer} />
      ) : null}

      {attempted && !isValid && (
        <Text style={styles.errorHint}>Please fill in all required fields</Text>
      )}

      {(!embeddedInScreen || !hideEmbeddedSave) && (
        <OrangeButton
          onPress={handleSave}
          disabled={saving}
          style={embeddedInScreen ? styles.ctaScreen : styles.cta}
        >
          {saving ? <ActivityIndicator color={Colors.white} /> : saveLabel}
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
  batchSection: {
    marginBottom: 12,
  },
  batchHint: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 10,
    lineHeight: 18,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.gray100,
    maxWidth: "100%",
  },
  chipText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
    maxWidth: 160,
  },
  addChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.orange,
    borderStyle: "dashed",
  },
  addChipText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.orange,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    maxHeight: "70%",
  },
  modalTitle: {
    fontFamily: Font.displayBold,
    fontSize: 18,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  modalList: {
    maxHeight: 280,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray100,
  },
  modalRowText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  modalCancel: {
    marginTop: 12,
    alignItems: "center",
    paddingVertical: 12,
  },
  modalCancelText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.textSecondary,
  },
});
