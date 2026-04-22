import { styles } from "@/screen-styles/upgrade.styles";
import { Colors } from "@/constants/colors";
import type { UpgradeCellDisplay } from "@/constants/upgradeComparison";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";

export function CellIcon({
  type,
  label,
}: {
  type: UpgradeCellDisplay;
  label?: string;
}) {
  if (type === "pill" && label) {
    return (
      <View style={[styles.pill, styles.pillPro]}>
        <Text style={[styles.pillText, styles.pillTextPro]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    );
  }
  if (type === "check") {
    return (
      <View style={styles.checkBubble}>
        <MaterialCommunityIcons name="check" size={14} color={Colors.white} />
      </View>
    );
  }
  return (
    <MaterialCommunityIcons name="close" size={18} color={Colors.gray400} />
  );
}
