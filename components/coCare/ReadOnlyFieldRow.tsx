import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { StyleSheet, Text, View } from "react-native";

type Props = { label: string; value: string };

/** Label + value row for co-carer read-only detail screens. */
export function ReadOnlyFieldRow({ label, value }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || "—"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  label: {
    fontFamily: Font.uiSemiBold,
    fontSize: 12,
    color: Colors.sectionLabel,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  value: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
});
