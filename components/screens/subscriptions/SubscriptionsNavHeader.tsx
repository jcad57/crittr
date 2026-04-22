import { styles } from "@/screen-styles/subscriptions.styles";
import { Colors } from "@/constants/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

export function SubscriptionsNavHeader({
  onBack,
  showRefetchSpinner,
}: {
  onBack: () => void;
  showRefetchSpinner?: boolean;
}) {
  return (
    <View style={styles.nav}>
      <Pressable onPress={onBack} hitSlop={12}>
        <MaterialCommunityIcons
          name="chevron-left"
          size={28}
          color={Colors.textPrimary}
        />
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        Subscriptions
      </Text>
      <View style={styles.navSpacer}>
        {showRefetchSpinner ? (
          <ActivityIndicator size="small" color={Colors.orange} />
        ) : null}
      </View>
    </View>
  );
}
