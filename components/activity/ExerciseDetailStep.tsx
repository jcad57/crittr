import DropdownSelect from "@/components/onboarding/DropdownSelect";
import FormInput from "@/components/onboarding/FormInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { useActivityFormStore } from "@/stores/activityFormStore";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const EXERCISE_TYPES = ["Walk", "Run", "Dog Park", "Home Playtime", "Other"];

type Props = {
  onSave: () => Promise<void>;
  onBack: () => void;
  /** @default "Save" */
  saveLabel?: string;
};

export default function ExerciseDetailStep({
  onSave,
  onBack,
  saveLabel = "Save",
}: Props) {
  const form = useActivityFormStore((s) => s.exerciseForm);
  const update = useActivityFormStore((s) => s.updateExercise);
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Exercise Details</Text>

      <FormInput
        label="Label"
        required
        placeholder="Morning walk, afternoon hike…"
        value={form.label}
        onChangeText={(v) => update({ label: v })}
        containerStyle={styles.spacing}
        error={attempted && !form.label.trim()}
      />

      <Text style={styles.fieldLabel}>Exercise type *</Text>
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
          containerStyle={styles.spacing}
          error={attempted && !form.customExerciseType.trim()}
        />
      )}

      <Text style={styles.fieldLabel}>Duration *</Text>
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
        containerStyle={styles.spacing}
      />

      <FormInput
        label="Location"
        placeholder="Park name or address"
        value={form.location}
        onChangeText={(v) => update({ location: v })}
        containerStyle={styles.spacing}
      />

      <FormInput
        label="Notes"
        placeholder="Any notes about this exercise"
        value={form.notes}
        onChangeText={(v) => update({ notes: v })}
        multiline
        containerStyle={styles.spacing}
      />

      <View style={styles.spacer} />

      {attempted && !isValid && (
        <Text style={styles.errorHint}>Please fill in all required fields</Text>
      )}

      <OrangeButton onPress={handleSave} disabled={saving} style={styles.cta}>
        {saving ? <ActivityIndicator color={Colors.white} /> : saveLabel}
      </OrangeButton>

      <Pressable onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  spacing: { marginBottom: 12 },
  row: { flexDirection: "row", gap: 12, marginBottom: 12 },
  halfInput: { flex: 1 },
  spacer: { flex: 1, minHeight: 24 },
  errorHint: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 13,
    color: Colors.error,
    textAlign: "center",
    marginBottom: 8,
  },
  cta: { marginTop: 12 },
  backButton: { alignSelf: "center", paddingTop: 16 },
  backText: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 15,
    color: Colors.textSecondary,
  },
});
