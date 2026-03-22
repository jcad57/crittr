import { StyleProp, StyleSheet, Text, TextStyle } from "react-native";

type FontWeight =
  | "regular"
  | "medium"
  | "semi-bold"
  | "bold"
  | "condensed"
  | "condensed-medium"
  | "condensed-semi-bold"
  | "condensed-bold"
  | "semi-condensed"
  | "semi-condensed-medium"
  | "semi-condensed-semi-bold"
  | "semi-condensed-bold";

const FONT_FAMILY: Record<FontWeight, string> = {
  "regular":                  "InstrumentSans-Regular",
  "medium":                   "InstrumentSans-Medium",
  "semi-bold":                "InstrumentSans-SemiBold",
  "bold":                     "InstrumentSans-Bold",
  "condensed":                "InstrumentSans_Condensed-Regular",
  "condensed-medium":         "InstrumentSans_Condensed-Medium",
  "condensed-semi-bold":      "InstrumentSans_Condensed-SemiBold",
  "condensed-bold":           "InstrumentSans_Condensed-Bold",
  "semi-condensed":           "InstrumentSans_SemiCondensed-Regular",
  "semi-condensed-medium":    "InstrumentSans_SemiCondensed-Medium",
  "semi-condensed-semi-bold": "InstrumentSans_SemiCondensed-SemiBold",
  "semi-condensed-bold":      "InstrumentSans_SemiCondensed-Bold",
};

type StyledTextProps = {
  weight?: FontWeight;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
};

export default function StyledText({
  weight = "regular",
  size = 16,
  color,
  style,
  children,
}: StyledTextProps) {
  return (
    <Text
      style={[
        styles.base,
        { fontFamily: FONT_FAMILY[weight], fontSize: size },
        color ? { color } : undefined,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: "#111827",
  },
});
