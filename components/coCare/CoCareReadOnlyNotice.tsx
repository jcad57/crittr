import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

/**
 * Shown when a co-carer opens a management screen without the matching permission.
 */
export default function CoCareReadOnlyNotice() {
  return (
    <View style={styles.box} accessibilityRole="alert">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <MaterialCommunityIcons
          name="lock-outline"
          size={20}
          color={Colors.lavenderDark}
          style={styles.icon}
        />
        <Text style={styles.title}>View only</Text>
      </View>
      <Text style={styles.body}>
        You don't have permission to update these details.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: Colors.lavenderLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(107, 92, 163, 0.2)",
    flexDirection: "column",
  },
  icon: {
    marginBottom: 8,
  },
  title: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.lavenderDark,
    marginBottom: 6,
  },
  body: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
