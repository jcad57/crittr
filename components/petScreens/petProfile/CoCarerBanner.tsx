import { useThemeColors, useThemeValues } from "@/theme/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { getStyles } from "@/screen-styles/pet/[id]/index.styles";

export default function CoCarerBanner() {
  const Colors = useThemeColors();
  const styles = useThemeValues(getStyles);
  return (
    <View style={styles.coCarerBanner}>
      <MaterialCommunityIcons
        name="account-group-outline"
        size={16}
        color={Colors.lavenderDark}
      />
      <Text style={styles.coCarerBannerText}>
        You are co-caring for this pet
      </Text>
    </View>
  );
}
