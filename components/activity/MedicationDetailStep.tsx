import type { ActivityDetailStepRef } from "@/components/activity/ActivityDetailStepRef";
import ActivityOccurredTimeRow from "@/components/activity/ActivityOccurredTimeRow";
import AlsoLogForPetsSection from "@/components/activity/AlsoLogForPetsSection";
import DropdownSelect from "@/components/onboarding/DropdownSelect";
import FormInput from "@/components/onboarding/FormInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { usePetDetailsQuery, usePetsQuery } from "@/hooks/queries";
import { isPetActiveForDashboard } from "@/lib/petParticipation";
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
  embeddedInScreen?: boolean;
  hideEmbeddedSave?: boolean;
  showBatchPets?: boolean;
};

const MedicationDetailStep = forwardRef<ActivityDetailStepRef, Props>(
  function MedicationDetailStep(
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
  const form = useActivityFormStore((s) => s.medicationForm);
  const update = useActivityFormStore((s) => s.updateMedication);
  const medicationExtraPetIds = useActivityFormStore(
    (s) => s.medicationExtraPetIds,
  );
  const addMedicationExtraPetId = useActivityFormStore(
    (s) => s.addMedicationExtraPetId,
  );
  const removeMedicationExtraPetId = useActivityFormStore(
    (s) => s.removeMedicationExtraPetId,
  );
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const activePetId = usePetStore((s) => s.activePetId);
  const { data: petDetails } = usePetDetailsQuery(activePetId);
  const { data: allPets } = usePetsQuery();

  const petNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of allPets ?? []) {
      m.set(p.id, p.name?.trim() || "Pet");
    }
    return m;
  }, [allPets]);

  const selectableMedicationPets = useMemo(() => {
    const taken = new Set<string>([
      activePetId ?? "",
      ...medicationExtraPetIds,
    ]);
    return (allPets ?? []).filter(
      (p) => isPetActiveForDashboard(p) && !taken.has(p.id),
    );
  }, [allPets, activePetId, medicationExtraPetIds]);

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

  const medicationSelectError = attempted && !form.medicationId;
  const amountMissing = attempted && !form.amount.trim();
  const unitMissing = attempted && !form.unit;
  const amountRowInvalid = amountMissing || unitMissing;

  return (
    <View style={embeddedInScreen ? styles.containerEmbedded : styles.container}>
      {!embeddedInScreen ? (
        <Text style={styles.title}>Medication Details</Text>
      ) : null}

      <Text
        style={[
          fieldLabelStyle,
          medicationSelectError && styles.fieldLabelError,
        ]}
      >
        Medication *
      </Text>
      <View
        style={{
          zIndex: 80,
          marginBottom: embeddedInScreen ? 16 : 12,
        }}
      >
        <DropdownSelect
          placeholder="Select medication"
          value={medOptions.find((o) => o.id === form.medicationId)?.name ?? ""}
          options={medOptions.map((o) => o.name)}
          onSelect={(name) => {
            const match = medOptions.find((o) => o.name === name);
            if (match)
              update({ medicationId: match.id, medicationName: match.name });
          }}
          error={medicationSelectError}
        />
      </View>

      <Text
        style={[fieldLabelStyle, amountRowInvalid && styles.fieldLabelError]}
      >
        Amount *
      </Text>
      <View style={styles.amountRow}>
        <FormInput
          placeholder="Amt"
          value={form.amount}
          onChangeText={(v) => update({ amount: v })}
          keyboardType="numeric"
          containerStyle={styles.amountInput}
          error={amountMissing}
        />
        <View style={{ flex: 1, zIndex: 70 }}>
          <DropdownSelect
            placeholder="Type"
            value={form.unit}
            options={DOSAGE_TYPES}
            onSelect={(v) => update({ unit: v })}
            error={unitMissing}
          />
        </View>
      </View>

      <ActivityOccurredTimeRow containerStyle={blockSpacing} />
      <FormInput
        label="Notes"
        placeholder="Given with cheese, etc."
        value={form.notes}
        onChangeText={(v) => update({ notes: v })}
        multiline
        containerStyle={blockSpacing}
      />

      {showBatchPets ? (
        <AlsoLogForPetsSection
          hint="Same medication and dose for each pet. Add companions who received it too."
          extraPetIds={medicationExtraPetIds}
          selectablePets={selectableMedicationPets}
          petNameById={petNameById}
          onAddPet={addMedicationExtraPetId}
          onRemovePet={removeMedicationExtraPetId}
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

export default MedicationDetailStep;

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
  amountRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  amountInput: { width: 80 },
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
