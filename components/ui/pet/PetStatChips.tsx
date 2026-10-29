import { createThemeValues, useThemeColors, useThemeValues } from "@/theme/colors";
import { Font } from "@/theme/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type StatChipItem = {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  /** When provided, the chip becomes tappable and shows a subtle chevron. */
  onPress?: () => void;
  accessibilityLabel?: string;
};

type PetStatChipsProps = {
  items: StatChipItem[];
};

export default function PetStatChips({ items }: PetStatChipsProps) {
  const Colors = useThemeColors();
  const styles = useThemeValues(getStyles);
  return (
    <View style={styles.row}>
      {items.map((item, index) => {
        const tone = [Colors.sage, Colors.lavenderLight, Colors.peach][index % 3];
        const ink = [Colors.sageDark, Colors.lavenderDark, Colors.peachDark][index % 3];
        const inner = (
          <>
            <MaterialCommunityIcons
              name={item.icon}
              size={18}
              color={ink}
              style={styles.icon}
            />
            <Text style={styles.value} numberOfLines={1}>
              {item.value}
            </Text>
            <Text style={styles.label}>{item.label}</Text>
          </>
        );

        if (item.onPress) {
          return (
            <Pressable
              key={item.label}
              style={({ pressed }) => [
                styles.chip,
                { backgroundColor: tone },
                styles.chipTappable,
                pressed && styles.chipPressed,
              ]}
              onPress={item.onPress}
              accessibilityRole="button"
              accessibilityLabel={item.accessibilityLabel ?? item.label}
            >
              {inner}
            </Pressable>
          );
        }

        return (
          <View key={item.label} style={[styles.chip, { backgroundColor: tone }]}>
            {inner}
          </View>
        );
      })}
    </View>
  );
}

const getStyles = createThemeValues((Colors) => StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
  },
  chip: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 22,
    paddingVertical: 15,
    paddingHorizontal: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0,
    shadowRadius: 4,
    elevation: 0,
  },
  chipTappable: {
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipPressed: {
    backgroundColor: Colors.gray50,
    borderColor: Colors.gray200,
  },
  icon: {
    marginBottom: 6,
  },
  value: {
    fontFamily: Font.displaySemiBold,
    fontSize: 19,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 2,
  },
  label: {
    fontFamily: Font.uiRegular,
    fontSize: 11,
    color: Colors.gray500,
    textAlign: "center",
  },
}));
