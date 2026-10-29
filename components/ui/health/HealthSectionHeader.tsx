import { createThemeValues, useThemeValues } from "@/theme/colors";
import { Font } from "@/theme/typography";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  title: string;
  onAddPress?: () => void;
};

export default function HealthSectionHeader({ title, onAddPress }: Props) {
  const styles = useThemeValues(getStyles);
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {onAddPress ? (
        <Pressable onPress={onAddPress} hitSlop={8}>
          <Text style={styles.add}>Add</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const getStyles = createThemeValues((Colors) => StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 0,
    marginTop: 0,
  },
  title: {
    fontFamily: Font.displayBold,
    fontSize: 19,
    letterSpacing: -0.2,
    color: Colors.textPrimary,
    textTransform: "none",
  },
  add: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.orange,
  },
}));
