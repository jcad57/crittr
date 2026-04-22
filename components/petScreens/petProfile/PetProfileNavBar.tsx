import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "@/screen-styles/pet/[id]/index.styles";

type Props = {
  title: string;
  onBack: () => void;
};

export default function PetProfileNavBar({ title, onBack }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.navBar, { paddingTop: insets.top + 4 }]}>
      <Pressable onPress={onBack} style={styles.navBack} hitSlop={8}>
        <Text style={styles.navBackText}>&lt; Back</Text>
      </Pressable>
      <Text style={styles.navTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.navSpacer} />
    </View>
  );
}
