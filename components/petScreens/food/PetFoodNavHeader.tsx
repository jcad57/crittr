import { styles } from "@/screen-styles/pet/[id]/food/[foodId].styles";
import { Colors } from "@/constants/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

type Props = {
  title: string;
  onBack: () => void;
};

export default function PetFoodNavHeader({ title, onBack }: Props) {
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
      <View style={styles.navSpacer} />
    </View>
  );
}
