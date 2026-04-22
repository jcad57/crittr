import CoCareReadOnlyNotice from "@/components/coCare/CoCareReadOnlyNotice";
import { ReadOnlyFieldRow } from "@/components/coCare/ReadOnlyFieldRow";
import { styles } from "@/screen-styles/pet/[id]/vet-visits/[visitId].styles";
import type { PetVetVisit } from "@/types/database";
import { Pressable, ScrollView, Text, View } from "react-native";

type VetVisitReadOnlyViewProps = {
  visit: PetVetVisit;
  insetsTop: number;
  scrollInsetBottom: number;
  onBack: () => void;
};

export default function VetVisitReadOnlyView({
  visit,
  insetsTop,
  scrollInsetBottom,
  onBack,
}: VetVisitReadOnlyViewProps) {
  const whenReadOnly = new Date(visit.visit_at).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <View style={[styles.screen, { paddingTop: insetsTop + 8 }]}>
      <View style={styles.nav}>
        <Pressable onPress={onBack} hitSlop={8}>
          <Text style={styles.navBack}>&lt; Back</Text>
        </Pressable>
        <Text style={styles.navTitle} numberOfLines={1}>
          Visit details
        </Text>
        <View style={styles.navSpacer} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.body,
          { paddingBottom: scrollInsetBottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <CoCareReadOnlyNotice />
        <ReadOnlyFieldRow label="Title" value={visit.title} />
        <ReadOnlyFieldRow label="When" value={whenReadOnly} />
        <ReadOnlyFieldRow
          label="Location"
          value={visit.location?.trim() || "—"}
        />
        <ReadOnlyFieldRow
          label="Notes"
          value={visit.notes?.trim() || ""}
        />
      </ScrollView>
    </View>
  );
}
