import { styles } from "@/screen-styles/pet/[id]/medications/[medicationId].styles";
import CoCareReadOnlyNotice from "@/components/coCare/CoCareReadOnlyNotice";
import PetMedicationNavHeader from "@/components/petScreens/medication/PetMedicationNavHeader";
import { ScrollView, Text, View } from "react-native";

type Props = {
  topInset: number;
  onBack: () => void;
};

export default function PetMedicationNoPermissionAddView({
  topInset,
  onBack,
}: Props) {
  return (
    <View style={[styles.screen, { paddingTop: topInset + 8 }]}>
      <PetMedicationNavHeader
        title="Add medication"
        onBack={onBack}
        showAvatar={false}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.body, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <CoCareReadOnlyNotice />
        <Text style={styles.leadReadOnly}>
          Adding medications requires permission from the primary caretaker.
        </Text>
      </ScrollView>
    </View>
  );
}
