import { Colors } from "@/constants/colors";
import { PET_INFO_FIELD_MARGIN_BOTTOM } from "@/constants/petInfo";
import { Font } from "@/constants/typography";
import { Pressable, StyleSheet, Text, View } from "react-native";

type PetMicrochipToggleProps = {
  value: boolean | null;
  onChange: (v: boolean | null) => void;
};

export default function PetMicrochipToggle({
  value,
  onChange,
}: PetMicrochipToggleProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Is your pet microchipped?</Text>
      <View style={styles.row}>
        <Pressable
          style={[styles.option, value === true && styles.optionActive]}
          onPress={() => onChange(true)}
        >
          <Text
            style={[
              styles.optionText,
              value === true && styles.optionTextActive,
            ]}
          >
            Yes
          </Text>
        </Pressable>
        <Pressable
          style={[styles.option, value === false && styles.optionActive]}
          onPress={() => onChange(false)}
        >
          <Text
            style={[
              styles.optionText,
              value === false && styles.optionTextActive,
            ]}
          >
            No
          </Text>
        </Pressable>
        <Pressable
          style={[styles.option, value === null && styles.optionActive]}
          onPress={() => onChange(null)}
        >
          <Text
            style={[
              styles.optionText,
              value === null && styles.optionTextActive,
            ]}
          >
            Not sure
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
    marginBottom: 4,
  },
  hint: {
    fontFamily: Font.uiRegular,
    fontSize: 12,
    color: Colors.gray400,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 10,
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
