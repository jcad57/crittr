import ScreenHeader from "@/components/ui/ScreenHeader";
import CoCareReadOnlyNotice from "@/components/coCare/CoCareReadOnlyNotice";
import { ReadOnlyFieldRow } from "@/components/coCare/ReadOnlyFieldRow";
import PetNavAvatar from "@/components/ui/PetNavAvatar";
import { styles } from "@/screen-styles/pet/[id]/vaccinations/[vaccinationId].styles";
import type { PetVaccination, PetWithDetails } from "@/types/database";
import { ScrollView, View } from "react-native";

type VaccinationReadOnlyViewProps = {
  vaccination: PetVaccination;
  details: PetWithDetails | null | undefined;
  insetsTop: number;
  onBack: () => void;
  onAfterSwitchPet?: (newPetId: string) => void;
};

export default function VaccinationReadOnlyView({
  vaccination,
  details,
  insetsTop,
  onBack,
  onAfterSwitchPet,
}: VaccinationReadOnlyViewProps) {
  const fmt = (d: string | null | undefined) =>
    d
      ? new Date(`${d}T12:00:00`).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—";
  const expLabel = fmt(vaccination.expires_on);
  const administeredOnLabel = fmt(vaccination.administered_on);
  return (
    <View style={[styles.screen, { paddingTop: insetsTop + 8 }]}>
      <ScreenHeader
        title="Vaccination details"
        onBack={onBack}
        titleLines={2}
        right={
          <PetNavAvatar
            displayPet={details}
            accessibilityLabelPrefix="Vaccination details for"
            onAfterSwitchPet={onAfterSwitchPet}
          />
        }
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.body, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <CoCareReadOnlyNotice />
        <ReadOnlyFieldRow label="Name" value={vaccination.name} />
        <ReadOnlyFieldRow
          label="Date administered"
          value={administeredOnLabel}
        />
        <ReadOnlyFieldRow label="Expires" value={expLabel} />
        <ReadOnlyFieldRow
          label="Administered by"
          value={vaccination.administered_by?.trim() || ""}
        />
        <ReadOnlyFieldRow
          label="Lot number"
          value={vaccination.lot_number?.trim() || ""}
        />
        <ReadOnlyFieldRow
          label="Notes"
          value={vaccination.notes?.trim() || ""}
        />
      </ScrollView>
    </View>
  );
}
