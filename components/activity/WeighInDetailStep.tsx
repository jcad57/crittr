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

const UNIT_OPTIONS: { id: "lbs" | "kg"; label: string }[] = [
  { id: "lbs", label: "lbs" },
  { id: "kg", label: "kg" },
];

const WeighInDetailStep = forwardRef<ActivityDetailStepRef, Props>(
  function WeighInDetailStep(
    {
      onSave,
      onBack,
      saveLabel = "Save",
      embeddedInScreen = false,
      hideEmbeddedSave = false,
    },
    ref,
  ) {
    const form = useActivityFormStore((s) => s.weighInForm);
    const update = useActivityFormStore((s) => s.updateWeighIn);
    const [saving, setSaving] = useState(false);
    const [attempted, setAttempted] = useState(false);

    const parsedWeight = parseFloat(form.weight.replace(",", "."));
    const weightOk = Number.isFinite(parsedWeight) && parsedWeight > 0;

    const handleSave = useCallback(async () => {
      if (!weightOk) {
        setAttempted(true);
        return;
      }
      setSaving(true);
      try {
        await onSave();
      } finally {
        setSaving(false);
      }
    }, [weightOk, onSave]);

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
    const fieldLabelStyle = embeddedInScreen
      ? styles.fieldLabelScreen
      : styles.fieldLabel;

    return (
      <View style={embeddedInScreen ? styles.containerEmbedded : styles.container}>
        <View style={blockSpacing}>
          <Text
            style={[
              fieldLabelStyle,
              attempted && !weightOk && styles.fieldLabelError,
            ]}
          >
            New weight *
          </Text>
          <View style={styles.weightRow}>
            <FormInput
              placeholder="e.g. 24.5"
              value={form.weight}
              onChangeText={(v) => update({ weight: v })}
              keyboardType="decimal-pad"
              containerStyle={styles.weightInput}
              error={attempted && !weightOk}
            />
            <View style={styles.unitToggleRow}>
              {UNIT_OPTIONS.map((opt, idx) => {
                const active = form.weightUnit === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => update({ weightUnit: opt.id })}
                    style={[
                      styles.unitToggle,
                      idx === 0 && styles.unitToggleLeft,
                      active && styles.unitToggleActive,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Use ${opt.label}`}
                  >
                    <Text
                      style={[
                        styles.unitToggleText,
                        active && styles.unitToggleTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          {attempted && !weightOk ? (
            <Text style={styles.inlineError}>
              Enter a valid weight greater than 0.
            </Text>
          ) : null}
        </View>

        <ActivityOccurredTimeRow containerStyle={blockSpacing} />

        <FormInput
          label="Label"
          placeholder="e.g. Morning weigh-in"
          value={form.label}
          onChangeText={(v) => update({ label: v })}
          containerStyle={blockSpacing}
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

export default WeighInDetailStep;

const styles = StyleSheet.create({
  container: { flex: 1 },
  containerEmbedded: { width: "100%" },
  spacing: { marginBottom: 12 },
  spacingScreen: { marginBottom: 16 },
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
  weightRow: {
    flexDirection: "row",
    gap: 12,
  },
  weightInput: {
    flex: 1,
  },
  unitToggleRow: {
    flexDirection: "row",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  unitToggle: {
    paddingHorizontal: 16,
    height: 50,
    minWidth: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  unitToggleLeft: {
    borderRightWidth: 1,
    borderRightColor: Colors.gray200,
  },
  unitToggleActive: {
    backgroundColor: Colors.orangeLight,
  },
  unitToggleText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  unitToggleTextActive: {
    fontFamily: Font.uiBold,
    color: Colors.orange,
  },
  inlineError: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.error,
    marginTop: 8,
  },
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
