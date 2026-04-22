import CoCareReadOnlyNotice from "@/components/coCare/CoCareReadOnlyNotice";
import { ReadOnlyFieldRow } from "@/components/coCare/ReadOnlyFieldRow";
import PetNavAvatar from "@/components/ui/PetNavAvatar";
import { Colors } from "@/constants/colors";
import { styles } from "@/screen-styles/pet/[id]/vaccinations/[vaccinationId].styles";
import type { PetVaccination, PetWithDetails } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View } from "react-native";

type VaccinationReadOnlyViewProps = {
  vaccination: PetVaccination;
  details: PetWithDetails | null | undefined;
  insetsTop: number;
  onBack: () => void;
};

export default function VaccinationReadOnlyView({
  vaccination,
  details,
  insetsTop,
  onBack,
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
  const nextDueLabel = fmt(vaccination.next_due_date);
  return (
    <View style={[styles.screen, { paddingTop: insetsTop + 8 }]}>
      <View style={styles.nav}>
        <Pressable onPress={onBack} hitSlop={8}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={28}
            color={Colors.textPrimary}
          />
        </Pressable>
        <Text style={styles.navTitle} numberOfLines={2}>
          Vaccination details
        </Text>
        <PetNavAvatar
          displayPet={details}
          accessibilityLabelPrefix="Vaccination details for"
        />
      </View>
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
        <ReadOnlyFieldRow label="Next due" value={nextDueLabel} />
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
