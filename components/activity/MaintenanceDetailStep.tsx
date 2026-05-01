import type { ActivityDetailStepRef } from "@/components/activity/ActivityDetailStepRef";
import ActivityOccurredTimeRow from "@/components/activity/ActivityOccurredTimeRow";
import FormInput from "@/components/onboarding/FormInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
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

const MaintenanceDetailStep = forwardRef<ActivityDetailStepRef, Props>(
  function MaintenanceDetailStep(
    {
      onSave,
      onBack,
      saveLabel = "Save",
      embeddedInScreen = false,
      hideEmbeddedSave = false,
    },
    ref,
  ) {
    const form = useActivityFormStore((s) => s.maintenanceForm);
    const update = useActivityFormStore((s) => s.updateMaintenance);
    const [saving, setSaving] = useState(false);
    const [attempted, setAttempted] = useState(false);

    const labelOk = form.label.trim().length > 0;
    const isValid = labelOk;

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

    const blockSpacing = embeddedInScreen ? styles.spacingScreen : styles.spacing;

    return (
      <View style={embeddedInScreen ? styles.containerEmbedded : styles.container}>
        <FormInput
          label="What did you do?"
          required
          placeholder="e.g. Full litter change, scoop"
          value={form.label}
          onChangeText={(v) => update({ label: v })}
          containerStyle={blockSpacing}
          error={attempted && !labelOk}
        />

        <ActivityOccurredTimeRow containerStyle={blockSpacing} />

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

export default MaintenanceDetailStep;

const styles = StyleSheet.create({
  container: { flex: 1 },
  containerEmbedded: { width: "100%" },
  spacing: { marginBottom: 12 },
  spacingScreen: { marginBottom: 16 },
  spacer: { flex: 1, minHeight: 24 },
  spacerEmbedded: { height: 8 },
  cta: { marginTop: 12 },
  ctaScreen: { marginTop: 8 },
  backButton: { alignSelf: "center", paddingTop: 16 },
  backText: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 15,
    color: Colors.textSecondary,
  },
});
