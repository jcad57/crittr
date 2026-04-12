import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  label: string;
  /** e.g. Edit button — when set, row uses space-between with label + action. */
  action?: ReactNode;
};

export default function ProfileSectionHeader({ label, action }: Props) {
  return (
    <View style={action != null ? styles.wrapWithAction : styles.wrapSimple}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapSimple: {
    marginBottom: 10,
    marginTop: 8,
  },
  wrapWithAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 8,
  },
  sectionLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: Colors.sectionLabel,
    textTransform: "uppercase",
  },
});
