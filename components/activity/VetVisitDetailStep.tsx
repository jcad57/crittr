import type { ActivityDetailStepRef } from "@/components/activity/ActivityDetailStepRef";
import ActivityOccurredTimeRow from "@/components/activity/ActivityOccurredTimeRow";
import AlsoLogForPetsSection from "@/components/activity/AlsoLogForPetsSection";
import DropdownSelect from "@/components/onboarding/DropdownSelect";
import FormInput from "@/components/onboarding/FormInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { usePetDetailsQuery, usePetsQuery } from "@/hooks/queries";
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

type Props = {
  onSave: () => Promise<void>;
  onBack: () => void;
  /** @default "Save" */
  saveLabel?: string;
  embeddedInScreen?: boolean;
  hideEmbeddedSave?: boolean;
};

const VetVisitDetailStep = forwardRef<ActivityDetailStepRef, Props>(
  function VetVisitDetailStep(
    {
      onSave,
      onBack,
      saveLabel = "Save",
      embeddedInScreen = false,
      hideEmbeddedSave = false,
    },
    ref,
  ) {
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

    const petNameById = useMemo(() => {
      const m = new Map<string, string>();
      for (const p of allPets ?? []) {
        m.set(p.id, p.name?.trim() || "Pet");
      }
      return m;
    }, [allPets]);

    const selectableVetPets = useMemo(() => {
      if (!allPets || !activePetId) return [];
      const taken = new Set<string>([activePetId, ...form.otherPetIds]);
      return allPets.filter(
        (p) => isPetActiveForDashboard(p) && !taken.has(p.id),
      );
    }, [allPets, activePetId, form.otherPetIds]);

    const isValid =
      form.label.trim().length > 0 &&
      form.vetLocation !== "" &&
      (form.vetLocation !== "Other" ||
        form.customVetLocation.trim().length > 0);

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

    const addOtherPet = useCallback(
      (petId: string) => {
        if (form.otherPetIds.includes(petId)) return;
        update({ otherPetIds: [...form.otherPetIds, petId] });
      },
      [form.otherPetIds, update],
    );

    const removeOtherPet = useCallback(
      (petId: string) => {
        update({
          otherPetIds: form.otherPetIds.filter((id) => id !== petId),
        });
      },
      [form.otherPetIds, update],
    );

    const fieldLabelStyle = embeddedInScreen
      ? styles.fieldLabelScreen
      : styles.fieldLabel;
    const blockSpacing = embeddedInScreen
      ? styles.spacingScreen
      : styles.spacing;

    const locationError = attempted && !form.vetLocation;
    const customLocationError =
      attempted &&
      form.vetLocation === "Other" &&
      !form.customVetLocation.trim();

    return (
      <View
        style={embeddedInScreen ? styles.containerEmbedded : styles.container}
      >
        {!embeddedInScreen ? (
          <Text style={styles.title}>Vet Visit Details</Text>
        ) : null}
        <Text style={styles.hint}>
          Manually add a vet visit for today if you never scheduled it.
        </Text>
        <FormInput
          label="Label"
          required
          placeholder="Checkup, hot spot, vaccinations…"
          value={form.label}
          onChangeText={(v) => update({ label: v })}
          containerStyle={blockSpacing}
          error={attempted && !form.label.trim()}
        />

        <Text style={fieldLabelStyle}>Location *</Text>
        <View
          style={{
            zIndex: 80,
            marginBottom: embeddedInScreen ? 16 : 12,
          }}
        >
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
            containerStyle={blockSpacing}
            error={attempted && !form.customVetLocation.trim()}
          />
        )}

        <ActivityOccurredTimeRow
          containerStyle={embeddedInScreen ? blockSpacing : styles.spacing}
        />
        <FormInput
          label="Notes"
          placeholder="Diagnoses, follow-ups, etc."
          value={form.notes}
          onChangeText={(v) => update({ notes: v })}
          multiline
          containerStyle={embeddedInScreen ? blockSpacing : styles.spacing}
        />

        <AlsoLogForPetsSection
          hint="Same visit details for each pet. Add companions who were at this visit."
          extraPetIds={form.otherPetIds}
          selectablePets={selectableVetPets}
          petNameById={petNameById}
          onAddPet={addOtherPet}
          onRemovePet={removeOtherPet}
          fieldLabelStyle={fieldLabelStyle}
        />

        {!embeddedInScreen || !hideEmbeddedSave ? (
          <View
            style={embeddedInScreen ? styles.spacerEmbedded : styles.spacer}
          />
        ) : null}

        {attempted && !isValid && (
          <Text style={styles.errorHint}>
            Please fill in all required fields
          </Text>
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

export default VetVisitDetailStep;

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
  hint: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 10,
    lineHeight: 18,
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
