import FormInput from "@/components/onboarding/FormInput";
import { Colors } from "@/constants/colors";
import { PET_INFO_FIELD_MARGIN_BOTTOM } from "@/constants/petInfo";
import { Font } from "@/constants/typography";
import type { PetFormData } from "@/types/database";
import { Pressable, StyleSheet, Text, View } from "react-native";

type PetWeightFieldsProps = {
  weight: string;
  weightUnit: PetFormData["weightUnit"];
  onWeightChange: (v: string) => void;
  onWeightUnitChange: (unit: PetFormData["weightUnit"]) => void;
  weightError: boolean;
};

export default function PetWeightFields({
  weight,
  weightUnit,
  onWeightChange,
  onWeightUnitChange,
  weightError,
}: PetWeightFieldsProps) {
  return (
    <>
      <Text style={[styles.fieldLabel, weightError && styles.fieldLabelError]}>
        Weight *
      </Text>
      <View style={styles.row}>
        <FormInput
          placeholder="Weight"
          value={weight}
          onChangeText={onWeightChange}
          keyboardType="numeric"
          containerStyle={styles.weightInput}
          error={weightError}
        />
        <View style={styles.unitToggleRow}>
          <Pressable
            style={[
              styles.unitToggle,
              styles.unitToggleLeft,
              weightUnit === "lbs" && styles.unitToggleActive,
            ]}
            onPress={() => onWeightUnitChange("lbs")}
          >
            <Text
              style={[
                styles.unitToggleText,
                weightUnit === "lbs" && styles.unitToggleTextActive,
              ]}
            >
              lbs
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.unitToggle,
              styles.unitToggleRight,
              weightUnit === "kg" && styles.unitToggleActive,
            ]}
            onPress={() => onWeightUnitChange("kg")}
          >
            <Text
              style={[
                styles.unitToggleText,
                weightUnit === "kg" && styles.unitToggleTextActive,
              ]}
            >
              kg
            </Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  fieldLabelError: {
    color: Colors.error,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: PET_INFO_FIELD_MARGIN_BOTTOM,
  },
  weightInput: {
    flex: 1,
  },
  unitToggleRow: {
    flexDirection: "row",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  unitToggle: {
    paddingHorizontal: 16,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  unitToggleLeft: {
    borderRightWidth: 1,
    borderRightColor: Colors.gray200,
  },
  unitToggleRight: {},
  unitToggleActive: {
    backgroundColor: Colors.orangeLight,
  },
  unitToggleText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  unitToggleTextActive: {
    fontFamily: Font.uiBold,
    color: Colors.orange,
  },
});
