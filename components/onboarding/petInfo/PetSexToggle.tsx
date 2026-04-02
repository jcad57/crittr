import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { PET_INFO_FIELD_MARGIN_BOTTOM } from "@/constants/petInfo";
import type { PetFormData } from "@/types/database";
import { Pressable, StyleSheet, Text, View } from "react-native";

type PetSexToggleProps = {
  sex: PetFormData["sex"];
  onChange: (sex: "male" | "female") => void;
  error: boolean;
};

export default function PetSexToggle({ sex, onChange, error }: PetSexToggleProps) {
  return (
    <>
      <Text style={[styles.fieldLabel, error && styles.fieldLabelError]}>
        Sex *
      </Text>
      <View style={styles.row}>
        <Pressable
          style={[
            styles.toggleOption,
            sex === "male" && styles.toggleActive,
            error && styles.toggleError,
          ]}
          onPress={() => onChange("male")}
        >
          <Text
            style={[
              styles.toggleText,
              sex === "male" && styles.toggleTextActive,
            ]}
          >
            Male
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.toggleOption,
            sex === "female" && styles.toggleActive,
            error && styles.toggleError,
          ]}
          onPress={() => onChange("female")}
        >
          <Text
            style={[
              styles.toggleText,
              sex === "female" && styles.toggleTextActive,
            ]}
          >
            Female
          </Text>
        </Pressable>
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
