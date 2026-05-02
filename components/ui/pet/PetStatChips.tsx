import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
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
  return (
    <View style={styles.row}>
      {items.map((item) => {
        const inner = (
          <>
            <MaterialCommunityIcons
              name={item.icon}
              size={18}
              color={Colors.orange}
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
          <View key={item.label} style={styles.chip}>
            {inner}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
  },
  chip: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
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
    fontSize: 15,
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
});
