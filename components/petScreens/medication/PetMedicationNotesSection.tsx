import MedicationSectionHeader from "@/components/petScreens/medication/MedicationSectionHeader";
import { MEDICATION_NOTES_MAX_LENGTH } from "@/constants/medicationEditForm";
import { createThemeValues, useThemeColors, useThemeValues } from "@/theme/colors";
import { Font } from "@/theme/typography";
import { StyleSheet, Text, TextInput, View } from "react-native";

type Props = {
  petName: string;
  value: string;
  onChangeText: (text: string) => void;
};

export default function PetMedicationNotesSection({
  petName,
  value,
  onChangeText,
}: Props) {
  const Colors = useThemeColors();
  const styles = useThemeValues(getStyles);
  const safeName = petName.trim() || "your pet";
  const maxLen = Math.max(MEDICATION_NOTES_MAX_LENGTH, value.length);

  return (
    <View style={styles.wrap}>
      <MedicationSectionHeader
        icon="note-text-outline"
        label="Notes (optional)"
      />
      <View style={styles.box}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={`This is to treat ${safeName}'s heartworms... etc`}
          placeholderTextColor={Colors.gray400}
          multiline
          textAlignVertical="top"
          maxLength={maxLen}
        />
        <Text style={styles.counter}>
          {value.length}/{MEDICATION_NOTES_MAX_LENGTH}
        </Text>
      </View>
    </View>
  );
}

const getStyles = createThemeValues((Colors) => StyleSheet.create({
  wrap: {
    marginBottom: 8,
  },
  box: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    minHeight: 112,
  },
  input: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textPrimary,
    minHeight: 72,
    padding: 0,
  },
  counter: {
    marginTop: 8,
    alignSelf: "flex-end",
    fontFamily: Font.uiMedium,
    fontSize: 12,
    color: Colors.gray400,
  },
}));
