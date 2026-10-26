import ScreenHeader from "@/components/ui/ScreenHeader";
import { styles } from "@/screen-styles/pet/[id]/food/[foodId].styles";
import CoCareReadOnlyNotice from "@/components/coCare/CoCareReadOnlyNotice";
import { ReadOnlyFieldRow } from "@/components/coCare/ReadOnlyFieldRow";
import { useUserDateTimePrefs } from "@/hooks/useUserDateTimePrefs";
import type { PetFood } from "@/types/database";
import { formatPetFoodPortionSubline, isTreatFood } from "@/utils/petFood";
import { ScrollView, View } from "react-native";

type Props = {
  existing: PetFood;
  topInset: number;
  bottomPadding: number;
  onBack: () => void;
};

export default function PetFoodReadOnlyView({
  existing,
  topInset,
  bottomPadding,
  onBack,
}: Props) {
  const { timeDisplay } = useUserDateTimePrefs();
  const treat = isTreatFood(existing);
  return (
    <View style={[styles.screen, { paddingTop: topInset + 8 }]}>
      <ScreenHeader title="Food details" onBack={onBack} titleLines={2} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.body, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <CoCareReadOnlyNotice />
        <ReadOnlyFieldRow
          label="Brand / name"
          value={existing.brand?.trim() || ""}
        />
        <ReadOnlyFieldRow label="Type" value={treat ? "Treat" : "Meal"} />
        <ReadOnlyFieldRow
          label="Feeding schedule"
          value={formatPetFoodPortionSubline(existing, timeDisplay)}
        />
        <ReadOnlyFieldRow
          label="Notes"
          value={existing.notes?.trim() || ""}
        />
      </ScrollView>
    </View>
  );
}
