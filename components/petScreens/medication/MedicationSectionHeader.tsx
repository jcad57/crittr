import { createThemeValues, useThemeColors, useThemeValues } from "@/theme/colors";
import { Font } from "@/theme/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  right?: ReactNode;
  error?: boolean;
};

export default function MedicationSectionHeader({
  icon,
  label,
  right,
  error,
}: Props) {
  const Colors = useThemeColors();
  const styles = useThemeValues(getStyles);
  const tint = error ? Colors.error : Colors.sectionLabel;
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <MaterialCommunityIcons name={icon} size={18} color={tint} />
        <Text style={[styles.label, error && styles.labelError]}>{label}</Text>
      </View>
      {right}
    </View>
  );
}

const getStyles = createThemeValues((Colors) => StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 8,
    gap: 12,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  label: {
    fontFamily: Font.uiSemiBold,
    fontSize: 12,
    letterSpacing: 0.8,
    color: Colors.sectionLabel,
    textTransform: "uppercase",
  },
  labelError: {
    color: Colors.error,
  },
}));
