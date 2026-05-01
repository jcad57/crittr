import { styles } from "@/screen-styles/pet/[id]/medications/[medicationId].styles";
import PetNavAvatar from "@/components/ui/PetNavAvatar";
import { Colors } from "@/constants/colors";
import type { Pet } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

type Props = {
  title: string;
  onBack: () => void;
  displayPet?: Pet | null;
  accessibilityLabelPrefix?: string;
  showAvatar?: boolean;
  onAfterSwitchPet?: (newPetId: string) => void;
};

export default function PetMedicationNavHeader({
  title,
  onBack,
  displayPet,
  accessibilityLabelPrefix,
  showAvatar = true,
  onAfterSwitchPet,
}: Props) {
  return (
    <View style={styles.nav}>
      <Pressable onPress={onBack} hitSlop={8}>
        <MaterialCommunityIcons
          name="chevron-left"
          size={28}
          color={Colors.textPrimary}
        />
      </Pressable>
      <Text style={styles.navTitle} numberOfLines={2}>
        {title}
      </Text>
      {showAvatar && displayPet ? (
        <PetNavAvatar
          displayPet={displayPet}
          accessibilityLabelPrefix={accessibilityLabelPrefix}
          onAfterSwitchPet={onAfterSwitchPet}
        />
      ) : (
        <View style={styles.navSpacer} />
      )}
    </View>
  );
}
