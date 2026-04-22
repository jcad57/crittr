import { styles } from "@/screen-styles/pet/[id]/food/[foodId].styles";
import CoCareReadOnlyNotice from "@/components/coCare/CoCareReadOnlyNotice";
import PetFoodNavHeader from "@/components/petScreens/food/PetFoodNavHeader";
import { ScrollView, Text, View } from "react-native";

type Props = {
  topInset: number;
  bottomPadding: number;
  onBack: () => void;
};

export default function PetFoodNoPermissionAddView({
  topInset,
  bottomPadding,
  onBack,
}: Props) {
  return (
    <View style={[styles.screen, { paddingTop: topInset + 8 }]}>
      <PetFoodNavHeader title="Add food" onBack={onBack} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.body, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <CoCareReadOnlyNotice />
        <Text style={styles.lead}>
          Adding foods requires permission from the primary caretaker.
        </Text>
      </ScrollView>
    </View>
  );
}
