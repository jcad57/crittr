import { useThemeValues } from "@/theme/colors";
import { getStyles } from "@/screen-styles/subscriptions.styles";
import { Text, View } from "react-native";

export function SubscriptionRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const styles = useThemeValues(getStyles);
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}
