import type { ActivityDetailStepRef } from "@/components/activity/ActivityDetailStepRef";
import ActivityOccurredTimeRow from "@/components/activity/ActivityOccurredTimeRow";
import FormInput from "@/components/onboarding/FormInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { useActivityFormStore } from "@/stores/activityFormStore";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useState,
} from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  onSave: () => Promise<void>;
  onBack: () => void;
  saveLabel?: string;
  embeddedInScreen?: boolean;
  hideEmbeddedSave?: boolean;
};

const TrainingDetailStep = forwardRef<ActivityDetailStepRef, Props>(
  function TrainingDetailStep(
    {
      onSave,
      onBack,
      saveLabel = "Save",
      embeddedInScreen = false,
      hideEmbeddedSave = false,
    },
    ref,
  ) {
    const form = useActivityFormStore((s) => s.trainingForm);
    const update = useActivityFormStore((s) => s.updateTraining);
    const [saving, setSaving] = useState(false);
    const [attempted, setAttempted] = useState(false);

    const mins = form.durationMinutes.trim()
      ? parseInt(form.durationMinutes.trim(), 10)
      : NaN;
    const durationOk = Number.isFinite(mins) && mins >= 1;

    const isValid =
      form.location.trim().length > 0 && durationOk;

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

    return (
      <View style={embeddedInScreen ? styles.containerEmbedded : styles.container}>
        <FormInput
          label="Title"
          placeholder="Training"
          value={form.label}
          onChangeText={(v) => update({ label: v })}
          containerStyle={blockSpacing}
        />

        <ActivityOccurredTimeRow containerStyle={blockSpacing} />

        <FormInput
          label="Location"
          required
          placeholder="Park, facility, or address"
          value={form.location}
          onChangeText={(v) => update({ location: v })}
          containerStyle={blockSpacing}
          error={attempted && !form.location.trim()}
        />

        <FormInput
          label="Duration (minutes)"
          required
          placeholder="e.g. 30"
          value={form.durationMinutes}
          onChangeText={(v) => update({ durationMinutes: v })}
          keyboardType="numeric"
          containerStyle={blockSpacing}
          error={attempted && !durationOk}
        />

        <FormInput
          label="Notes"
          placeholder="Optional"
          value={form.notes}
          onChangeText={(v) => update({ notes: v })}
          multiline
          containerStyle={blockSpacing}
        />

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

export default TrainingDetailStep;

const styles = StyleSheet.create({
  container: { flex: 1 },
  containerEmbedded: { width: "100%" },
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
  spacing: { marginBottom: 12 },
  spacingScreen: { marginBottom: 16 },
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
