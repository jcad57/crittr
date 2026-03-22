import { Colors } from "@/constants/colors";
import type { PetProfile } from "@/data/mockDashboard";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

type ChipData = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  value: string;
  bg: string;
  tint: string;
};

type PetAttributeChipsProps = {
  profile: PetProfile;
};

export default function PetAttributeChips({ profile }: PetAttributeChipsProps) {
  const chips: ChipData[] = [
    {
      icon: "cake-variant-outline",
      label: "Age",
      value: `${profile.age} yr`,
      bg: Colors.coralLight,
      tint: Colors.coral,
    },
    {
      icon: "scale-bathroom",
      label: "Weight",
      value: `${profile.weightLbs} lb`,
      bg: Colors.lavenderLight,
      tint: Colors.lavender,
    },
    {
      icon: profile.sex === "male" ? "gender-male" : "gender-female",
      label: "Sex",
      value: profile.sex === "male" ? "Male" : "Female",
      bg: Colors.skyLight,
      tint: Colors.sky,
    },
    {
      icon: "palette-outline",
      label: "Color",
      value: profile.color,
      bg: Colors.goldLight,
      tint: Colors.gold,
    },
  ];

  return (
    <View style={styles.row}>
      {chips.map((chip) => (
        <View key={chip.label} style={[styles.chip, { backgroundColor: chip.bg }]}>
          <View style={[styles.iconCircle, { backgroundColor: chip.tint + "33" }]}>
            <MaterialCommunityIcons name={chip.icon} size={18} color={chip.tint} />
          </View>
          <Text style={[styles.value, { color: chip.tint }]}>{chip.value}</Text>
          <Text style={styles.label}>{chip.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  chip: {
    flex: 1,
    alignItems: "center",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 6,
    gap: 4,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  value: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 13,
  },
  label: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 11,
    color: Colors.textSecondary,
  },
});
