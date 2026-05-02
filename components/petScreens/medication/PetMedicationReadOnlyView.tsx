import { styles } from "@/screen-styles/pet/[id]/medications/[medicationId].styles";
import CoCareReadOnlyNotice from "@/components/coCare/CoCareReadOnlyNotice";
import { ReadOnlyFieldRow } from "@/components/coCare/ReadOnlyFieldRow";
import PetMedicationNavHeader from "@/components/petScreens/medication/PetMedicationNavHeader";
import { useUserDateTimePrefs } from "@/hooks/useUserDateTimePrefs";
import type { PetMedication, PetWithDetails } from "@/types/database";
import { getMedicationReminderTimes } from "@/utils/medicationReminderTimes";
import {
  formatReminderHHmmForDisplay,
  formatUserLongDateFromYmd,
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
  const reminderTimes = getMedicationReminderTimes(med);
  const reminderLabel =
    reminderTimes.length > 0
      ? reminderTimes
          .map((t) => formatReminderHHmmForDisplay(t, timeDisplay))
          .join(", ")
      : "—";
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
        <ReadOnlyFieldRow label="Dosage" value={med.dosage?.trim() || ""} />
        <ReadOnlyFieldRow
          label="Frequency"
          value={med.frequency?.trim() || ""}
        />
        <ReadOnlyFieldRow
          label="Condition"
          value={med.condition?.trim() || ""}
        />
        <ReadOnlyFieldRow label="Notes" value={med.notes?.trim() || ""} />
        <ReadOnlyFieldRow label="Reminder time" value={reminderLabel} />
        <ReadOnlyFieldRow label="Last given" value={lastGiven} />
      </ScrollView>
    </View>
  );
}
