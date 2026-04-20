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

const PottyDetailStep = forwardRef<ActivityDetailStepRef, Props>(
  function PottyDetailStep(
    {
      onSave,
      onBack,
      saveLabel = "Save",
      embeddedInScreen = false,
      hideEmbeddedSave = false,
    },
    ref,
  ) {
    const form = useActivityFormStore((s) => s.pottyForm);
    const update = useActivityFormStore((s) => s.updatePotty);
    const [saving, setSaving] = useState(false);
    const [attempted, setAttempted] = useState(false);

    const typeOk = form.pee || form.poo;
    const isValid = typeOk;

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

    const toggleChip = (key: "pee" | "poo", active: boolean) => (
      <Pressable
        key={key}
        onPress={() => update({ [key]: !form[key] })}
        style={({ pressed }) => [
          styles.chip,
          active && styles.chipOn,
          pressed && styles.chipPressed,
        ]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: active }}
        accessibilityLabel={key === "pee" ? "Pee" : "Poo"}
      >
        <Text style={[styles.chipText, active && styles.chipTextOn]}>
          {key === "pee" ? "Pee" : "Poo"}
        </Text>
      </Pressable>
    );

    return (
      <View style={embeddedInScreen ? styles.containerEmbedded : styles.container}>
        <View style={blockSpacing}>
          <Text style={fieldLabelStyle}>Type</Text>
          <View style={styles.chipRow}>
            {toggleChip("pee", form.pee)}
            {toggleChip("poo", form.poo)}
          </View>
          {attempted && !typeOk ? (
            <Text style={styles.inlineError}>Select pee and/or poo</Text>
          ) : null}
        </View>

        <ActivityOccurredTimeRow containerStyle={blockSpacing} />

        <FormInput
          label="Location"
          placeholder="Optional"
          value={form.location}
          onChangeText={(v) => update({ location: v })}
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

export default PottyDetailStep;

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
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  chipOn: {
    borderColor: Colors.orange,
    backgroundColor: Colors.orangeLight,
  },
  chipPressed: {
    opacity: 0.88,
  },
  chipText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  chipTextOn: {
    color: Colors.orangeDark,
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
