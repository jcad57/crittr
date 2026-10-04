import { styles } from "@/screen-styles/pet/[id]/medications/[medicationId].styles";
import CoCareReadOnlyNotice from "@/components/coCare/CoCareReadOnlyNotice";
import { ReadOnlyFieldRow } from "@/components/coCare/ReadOnlyFieldRow";
import PetMedicationNavHeader from "@/components/petScreens/medication/PetMedicationNavHeader";
import { useUserDateTimePrefs } from "@/hooks/useUserDateTimePrefs";
import type { PetMedication, PetWithDetails } from "@/types/database";
import { hydrateDosagesFromMed } from "@/utils/medicationDosageDraft";
import {
  frequencyDraftFromMed,
  frequencyLabelForDraft,
} from "@/utils/medicationFrequency";
import {
  formatUserLongDateFromYmd,
  formatUserTime,
} from "@/utils/userDateTimeFormat";
import { ScrollView, View } from "react-native";

type Props = {
  med: PetMedication;
  details: PetWithDetails;
  topInset: number;
  onBack: () => void;
  onAfterSwitchPet?: (newPetId: string) => void;
};

export default function PetMedicationReadOnlyView({
  med,
  details,
  topInset,
  onBack,
  onAfterSwitchPet,
}: Props) {
  const { timeDisplay, dateDisplay } = useUserDateTimePrefs();
  const dosages = hydrateDosagesFromMed(med);
  const frequencyLabel = frequencyLabelForDraft(frequencyDraftFromMed(med));
  const lastGiven =
    formatUserLongDateFromYmd(med.last_given_on?.trim(), dateDisplay) ||
    med.last_given_on?.trim() ||
    "—";

  return (
    <View style={[styles.screen, { paddingTop: topInset + 8 }]}>
      <PetMedicationNavHeader
        title="Medication details"
        onBack={onBack}
        displayPet={details}
        accessibilityLabelPrefix="Medication details for"
        onAfterSwitchPet={onAfterSwitchPet}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.body, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <CoCareReadOnlyNotice />
        <ReadOnlyFieldRow label="Name" value={med.name} />
        {dosages.length > 0 ? (
          dosages.map((d) => (
            <ReadOnlyFieldRow
              key={d.key}
              label={formatUserTime(d.reminderTime, timeDisplay)}
              value={
                [d.dosageAmount.trim(), d.dosageType.trim()]
                  .filter(Boolean)
                  .join(" ") || "—"
              }
            />
          ))
        ) : (
          <ReadOnlyFieldRow label="Dosage" value={med.dosage?.trim() || ""} />
        )}
        <ReadOnlyFieldRow label="How often" value={frequencyLabel} />
        <ReadOnlyFieldRow
          label="Condition"
          value={med.condition?.trim() || ""}
        />
        <ReadOnlyFieldRow label="Notes" value={med.notes?.trim() || ""} />
        <ReadOnlyFieldRow label="Last given" value={lastGiven} />
      </ScrollView>
    </View>
  );
}
