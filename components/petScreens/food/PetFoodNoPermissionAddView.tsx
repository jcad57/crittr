import ScreenHeader from "@/components/ui/ScreenHeader";
import { styles } from "@/screen-styles/pet/[id]/food/[foodId].styles";
import CoCareReadOnlyNotice from "@/components/coCare/CoCareReadOnlyNotice";
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
      <ScreenHeader title="Add food" onBack={onBack} titleLines={2} />
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
