import { Colors } from "@/constants/colors";
import { StyleSheet, View } from "react-native";

export default function Divider() {
  return (
    <View style={styles.divider}>
      <View style={styles.dividerLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  divider: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    // marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.gray100,
    maxWidth: "80%",
  },
});
