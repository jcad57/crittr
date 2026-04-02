import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { ENERGY_OPTIONS, PET_INFO_FIELD_MARGIN_BOTTOM } from "@/constants/petInfo";
import type { PetFormData } from "@/types/database";
import { Pressable, StyleSheet, Text, View } from "react-native";

type PetEnergyLevelToggleProps = {
  energyLevel: PetFormData["energyLevel"];
  onChange: (level: "low" | "medium" | "high") => void;
  error: boolean;
};

export default function PetEnergyLevelToggle({
  energyLevel,
  onChange,
  error,
}: PetEnergyLevelToggleProps) {
  return (
    <>
      <Text
        style={[styles.sectionTitle, error && styles.sectionTitleError]}
      >
        Energy Level *
      </Text>
      <View style={styles.row}>
        {ENERGY_OPTIONS.map((level) => (
          <Pressable
            key={level}
            style={[
              styles.toggleOption,
              energyLevel === level && styles.toggleActive,
              error && styles.toggleError,
            ]}
            onPress={() => onChange(level)}
          >
            <Text
              style={[
                styles.toggleText,
                energyLevel === level && styles.toggleTextActive,
              ]}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontFamily: Font.uiBold,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  sectionTitleError: {
    color: Colors.error,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: PET_INFO_FIELD_MARGIN_BOTTOM,
  },
  toggleOption: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleActive: {
    backgroundColor: Colors.orangeLight,
    borderColor: Colors.orange,
  },
  toggleError: {
    borderColor: Colors.error,
  },
  toggleText: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  toggleTextActive: {
    fontFamily: Font.uiBold,
    color: Colors.orange,
  },
});
