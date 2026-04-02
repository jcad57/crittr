import { Colors } from "@/constants/colors";
import type { PetProfile } from "@/types/ui";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

type ChipData = {
  key: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  value: string;
  iconColor: string;
};

type PetAttributeChipsProps = {
  profile: PetProfile;
};

export default function PetAttributeChips({ profile }: PetAttributeChipsProps) {
  const microchipValue =
    profile.isMicrochipped === null
      ? "—"
      : profile.microchipLabel || (profile.isMicrochipped ? "Yes" : "No");

  const chips: ChipData[] = [
    {
      key: "age",
      icon: "cake-variant-outline",
      value: profile.ageDisplay || "—",
      iconColor: Colors.orange,
    },
    {
      key: "sex",
      icon: profile.sex === "male" ? "gender-male" : "gender-female",
      value: profile.sex === "male" ? "Male" : "Female",
      iconColor: Colors.skyDark,
    },
    {
      key: "chip",
      icon: "shield-check-outline",
      value: microchipValue,
      iconColor: Colors.amberDark,
    },
    {
      key: "weight",
      icon: "scale-bathroom",
      value: profile.weightDisplay,
      iconColor: Colors.successDark,
    },
  ];

  return (
    <View style={styles.card} accessibilityRole="summary">
      {chips.map((chip) => (
        <View
          key={chip.key}
          style={styles.cell}
          accessibilityLabel={`${chip.key}, ${chip.value}`}
        >
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons
              name={chip.icon}
              size={20}
              color={chip.iconColor}
            />
          </View>
          <Text style={styles.value} numberOfLines={2}>
            {chip.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
    backgroundColor: Colors.orangeLight,
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(252, 141, 44, 0.14)",
  },
  cell: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 2,
    gap: 8,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  value: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 12,
    lineHeight: 15,
    textAlign: "center",
    color: Colors.textPrimary,
  },
});
