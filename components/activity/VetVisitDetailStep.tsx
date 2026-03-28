import DropdownSelect from "@/components/onboarding/DropdownSelect";
import FormInput from "@/components/onboarding/FormInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { usePetDetailsQuery, usePetsQuery } from "@/hooks/queries";
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

type Props = {
  onSave: () => Promise<void>;
  onBack: () => void;
  /** @default "Save" */
  saveLabel?: string;
};

export default function VetVisitDetailStep({
  onSave,
  onBack,
  saveLabel = "Save",
}: Props) {
  const form = useActivityFormStore((s) => s.vetVisitForm);
  const update = useActivityFormStore((s) => s.updateVetVisit);
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const activePetId = usePetStore((s) => s.activePetId);
  const { data: petDetails } = usePetDetailsQuery(activePetId);
  const { data: allPets } = usePetsQuery();

  const vetClinic = petDetails
    ? ((
        petDetails as { primary_vet_clinic?: string | null }
      ).primary_vet_clinic?.trim() ?? "")
    : "";

  const locationOptions = useMemo(() => {
    const opts: string[] = [];
    if (vetClinic) opts.push(vetClinic);
    opts.push("Other");
    return opts;
  }, [vetClinic]);

  const otherPets = useMemo(() => {
    if (!allPets || !activePetId) return [];
    return allPets.filter((p) => p.id !== activePetId);
  }, [allPets, activePetId]);

  const isValid =
    form.label.trim().length > 0 &&
    form.vetLocation !== "" &&
    (form.vetLocation !== "Other" || form.customVetLocation.trim().length > 0);

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

  const toggleOtherPet = (petId: string) => {
    const current = form.otherPetIds;
    if (current.includes(petId)) {
      update({ otherPetIds: current.filter((id) => id !== petId) });
    } else {
      update({ otherPetIds: [...current, petId] });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vet Visit Details</Text>

      <FormInput
        label="Label"
        required
        placeholder="Checkup, hot spot, vaccinations…"
        value={form.label}
        onChangeText={(v) => update({ label: v })}
        containerStyle={styles.spacing}
        error={attempted && !form.label.trim()}
      />

      <Text style={styles.fieldLabel}>Location *</Text>
      <View style={{ zIndex: 80, marginBottom: 12 }}>
        <DropdownSelect
          placeholder="Select location"
          value={form.vetLocation}
          options={locationOptions}
          onSelect={(v) => update({ vetLocation: v })}
        />
      </View>

      {form.vetLocation === "Other" && (
        <FormInput
          placeholder="Clinic name or address"
          value={form.customVetLocation}
          onChangeText={(v) => update({ customVetLocation: v })}
          containerStyle={styles.spacing}
          error={attempted && !form.customVetLocation.trim()}
        />
      )}

      {otherPets.length > 0 && (
        <>
          <Text style={styles.fieldLabel}>Other pets at this visit?</Text>
          <View style={styles.petChips}>
            {otherPets.map((p) => {
              const selected = form.otherPetIds.includes(p.id);
              return (
                <Pressable
                  key={p.id}
                  style={[styles.petChip, selected && styles.petChipActive]}
                  onPress={() => toggleOtherPet(p.id)}
                >
                  <Text
                    style={[
                      styles.petChipText,
                      selected && styles.petChipTextActive,
                    ]}
                  >
                    {p.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      <FormInput
        label="Notes"
        placeholder="Diagnoses, follow-ups, etc."
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
  petChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  petChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  petChipActive: {
    backgroundColor: Colors.orangeLight,
    borderColor: Colors.orange,
  },
  petChipText: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  petChipTextActive: {
    color: Colors.orange,
  },
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
