import { createThemeValues, useThemeValues } from "@/theme/colors";
import { StyleSheet, View } from "react-native";

export default function Divider({ spacing }: { spacing?: number }) {
  const styles = useThemeValues(getStyles);
  return (
    <View style={styles.divider}>
      <View
        style={[styles.dividerLine, { marginVertical: spacing ? spacing : 24 }]}
      />
    </View>
  );
}

const getStyles = createThemeValues((Colors) => StyleSheet.create({
  divider: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.gray200,
    maxWidth: "80%",
  },
}));
