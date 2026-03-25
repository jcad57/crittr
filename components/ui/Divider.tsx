import { Colors } from "@/constants/colors";
import { StyleSheet, View } from "react-native";

export default function Divider({ spacing }: { spacing?: number }) {
  return (
    <View style={styles.divider}>
      <View
        style={[styles.dividerLine, { marginVertical: spacing ? spacing : 24 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  divider: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.gray100,
    maxWidth: "80%",
  },
});
