import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { PET_INFO_FIELD_MARGIN_BOTTOM } from "@/constants/petInfo";
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

type PetInsuranceToggleProps = {
  value: boolean | null;
  onChange: (v: boolean) => void;
  /** Extra layout above the label (e.g. separate from page intro copy). */
  containerStyle?: StyleProp<ViewStyle>;
};

export default function PetInsuranceToggle({
  value,
  onChange,
  containerStyle,
}: PetInsuranceToggleProps) {
  /** Unset / skipped during add-pet reads as “No” for display. */
  const yesActive = value === true;
  const noActive = value === false || value === null;

  return (
    <View style={[styles.wrap, containerStyle]}>
      <Text style={styles.label}>Pet insurance?</Text>
      <View style={styles.row}>
        <Pressable
          style={[styles.option, yesActive && styles.optionActive]}
          onPress={() => onChange(true)}
        >
          <Text
            style={[
              styles.optionText,
              yesActive && styles.optionTextActive,
            ]}
          >
            Yes
          </Text>
        </Pressable>
        <Pressable
          style={[styles.option, noActive && styles.optionActive]}
          onPress={() => onChange(false)}
        >
          <Text
            style={[
              styles.optionText,
              noActive && styles.optionTextActive,
            ]}
          >
            No
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: PET_INFO_FIELD_MARGIN_BOTTOM,
  },
  label: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  option: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  optionActive: {
    backgroundColor: Colors.orangeLight,
    borderColor: Colors.orange,
  },
  optionText: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  optionTextActive: {
    fontFamily: Font.uiBold,
    color: Colors.orange,
  },
});
