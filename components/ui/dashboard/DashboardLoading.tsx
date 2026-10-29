import { createThemeValues, useThemeColors, useThemeValues } from "@/theme/colors";
import { Font } from "@/theme/typography";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function DashboardLoading() {
  const Colors = useThemeColors();
  const styles = useThemeValues(getStyles);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={Colors.orange} />
        <Text style={styles.label}>Loading your dashboard…</Text>
      </View>
    </View>
  );
}

const getStyles = createThemeValues((Colors) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.screenBackground,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 24,
  },
  label: {
    fontFamily: Font.uiMedium,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
  },
}));
