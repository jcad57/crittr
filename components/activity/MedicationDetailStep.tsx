import DropdownSelect from "@/components/onboarding/DropdownSelect";
import FormInput from "@/components/onboarding/FormInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { usePetDetailsQuery } from "@/hooks/queries";
import { useActivityFormStore } from "@/stores/activityFormStore";
import { usePetStore } from "@/stores/petStore";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const DOSAGE_TYPES = [
  "Tablet",
  "Injection",
  "Liquid",
  "Topical",
  "Chewable",
  "Other",
];

type Props = {
  onSave: () => Promise<void>;
  onBack: () => void;
  /** @default "Save" */
  saveLabel?: string;
};

export default function MedicationDetailStep({
  onSave,
  onBack,
  saveLabel = "Save",
}: Props) {
  const form = useActivityFormStore((s) => s.medicationForm);
  const update = useActivityFormStore((s) => s.updateMedication);
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const activePetId = usePetStore((s) => s.activePetId);
  const { data: petDetails } = usePetDetailsQuery(activePetId);

  const medOptions = useMemo(() => {
    if (!petDetails) return [];
    return petDetails.medications.map((m) => ({ id: m.id, name: m.name }));
  }, [petDetails]);

  const isValid =
    form.medicationId.length > 0 &&
    form.amount.trim().length > 0 &&
    form.unit.length > 0;

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
      <Text style={styles.title}>Medication Details</Text>

      <Text style={styles.fieldLabel}>Medication *</Text>
      <View style={{ zIndex: 80, marginBottom: 12 }}>
        <DropdownSelect
          placeholder="Select medication"
          value={medOptions.find((o) => o.id === form.medicationId)?.name ?? ""}
          options={medOptions.map((o) => o.name)}
          onSelect={(name) => {
            const match = medOptions.find((o) => o.name === name);
            if (match)
              update({ medicationId: match.id, medicationName: match.name });
          }}
        />
      </View>

      <Text style={styles.fieldLabel}>Amount *</Text>
      <View style={styles.amountRow}>
        <FormInput
          placeholder="Amt"
          value={form.amount}
          onChangeText={(v) => update({ amount: v })}
          keyboardType="numeric"
          containerStyle={styles.amountInput}
          error={attempted && !form.amount.trim()}
        />
        <View style={{ flex: 1, zIndex: 70 }}>
          <DropdownSelect
            placeholder="Type"
            value={form.unit}
            options={DOSAGE_TYPES}
            onSelect={(v) => update({ unit: v })}
          />
        </View>
      </View>

      <FormInput
        label="Notes"
        placeholder="Given with cheese, etc."
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
  amountRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  amountInput: { width: 80 },
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
