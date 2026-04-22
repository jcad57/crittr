import PetNavAvatar from "@/components/ui/PetNavAvatar";
import type { PetWithDetails } from "@/types/database";
import { Pressable, Text, View } from "react-native";
import { styles } from "@/screen-styles/pet/[id]/insurance.styles";

type Props = {
  displayPet: PetWithDetails;
  onBack: () => void;
};

export default function InsuranceNavHeader({ displayPet, onBack }: Props) {
  return (
    <View style={styles.nav}>
      <View style={styles.navSideLeft}>
        <Pressable onPress={onBack} hitSlop={8}>
          <Text style={styles.navBack}>&lt; Back</Text>
        </Pressable>
      </View>
      <Text style={styles.navTitle} numberOfLines={1}>
        Insurance
      </Text>
      <View style={styles.navSideRight}>
        <PetNavAvatar
          displayPet={displayPet}
          accessibilityLabelPrefix="Insurance for"
        />
      </View>
    </View>
  );
}
