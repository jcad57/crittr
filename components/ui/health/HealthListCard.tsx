import { createThemeValues, useThemeValues } from "@/theme/colors";
import { StyleSheet, View } from "react-native";

type Props = {
  children: React.ReactNode;
};

/** White rounded container for grouped health rows. */
export default function HealthListCard({ children }: Props) {
  const styles = useThemeValues(getStyles);
  return <View style={styles.card}>{children}</View>;
}

const getStyles = createThemeValues((Colors) => StyleSheet.create({
  card: {
    backgroundColor: Colors.warmWhite,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.creamDark,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0,
    shadowRadius: 4,
    elevation: 0,
  },
}));
