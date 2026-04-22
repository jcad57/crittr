import { styles } from "@/screen-styles/pet/[id]/food/[foodId].styles";
import CoCareReadOnlyNotice from "@/components/coCare/CoCareReadOnlyNotice";
import { ReadOnlyFieldRow } from "@/components/coCare/ReadOnlyFieldRow";
import PetFoodNavHeader from "@/components/petScreens/food/PetFoodNavHeader";
import type { PetFood } from "@/types/database";
import { formatPetFoodPortionSubline, isTreatFood } from "@/utils/petFood";
import { ScrollView, Text, View } from "react-native";

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
  const treat = isTreatFood(existing);
  const meals =
    existing.meals_per_day != null && existing.meals_per_day >= 1
      ? String(existing.meals_per_day)
      : "—";
  return (
    <View style={[styles.screen, { paddingTop: topInset + 8 }]}>
      <PetFoodNavHeader title="Food details" onBack={onBack} />
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
        {treat ? (
          <>
            <ReadOnlyFieldRow
              label="Portion"
              value={formatPetFoodPortionSubline(existing)}
            />
            <ReadOnlyFieldRow label="Times per day" value={meals} />
          </>
        ) : (
          <ReadOnlyFieldRow
            label="Feeding schedule"
            value={formatPetFoodPortionSubline(existing)}
          />
        )}
        <ReadOnlyFieldRow
          label="Notes"
          value={existing.notes?.trim() || ""}
        />
      </ScrollView>
    </View>
  );
}
