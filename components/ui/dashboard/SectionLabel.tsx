import { Colors } from "@/theme/colors";
import { Font } from "@/theme/typography";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

type SectionLabelProps = {
  children: string;
  style?: StyleProp<ViewStyle>;
};

export default function SectionLabel({ children, style }: SectionLabelProps) {
  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.text}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 10,
  },
  text: {
    fontFamily: Font.displayBold,
    fontSize: 19,
    letterSpacing: -0.2,
    color: Colors.textPrimary,
    textTransform: "none",
  },
});
