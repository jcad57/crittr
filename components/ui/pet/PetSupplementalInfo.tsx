import { Colors } from "@/constants/colors";
import type { PetProfile } from "@/data/mockDashboard";
import { StyleSheet, Text, View } from "react-native";

type PetSupplementalInfoProps = {
  profile: PetProfile;
};

export default function PetSupplementalInfo({ profile }: PetSupplementalInfoProps) {
  const rows: { label: string; value: string }[] = [];

  if (profile.dateOfBirthFormatted) {
    rows.push({
      label: "Date of birth",
      value: profile.dateOfBirthFormatted,
    });
  }

  if (profile.exercisesPerDay != null) {
    rows.push({
      label: "Exercises per day",
      value: String(profile.exercisesPerDay),
    });
  }

  if (profile.allergies.length > 0) {
    rows.push({
      label: "Allergies",
      value: profile.allergies.join(", "),
    });
  }

  if (rows.length === 0) return null;

  return (
    <View style={[styles.wrap, styles.marginTop]}>
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <Text style={styles.label}>{row.label}</Text>
          <Text style={styles.value}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  marginTop: {
    marginTop: 4,
  },
  row: {
    gap: 4,
  },
  label: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  value: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 15,
    color: Colors.textPrimary,
  },
});
