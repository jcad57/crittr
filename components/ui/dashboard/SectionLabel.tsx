import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
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
    fontFamily: Font.uiSemiBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: Colors.sectionLabel,
    textTransform: "uppercase",
  },
});
