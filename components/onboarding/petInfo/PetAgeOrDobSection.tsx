import FormInput from "@/components/onboarding/FormInput";
import PetDateOfBirthField from "@/components/onboarding/petInfo/PetDateOfBirthField";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { PET_INFO_FIELD_MARGIN_BOTTOM } from "@/constants/petInfo";
import { StyleSheet, Text, View } from "react-native";

type PetAgeOrDobSectionProps = {
  ageYears: string;
  ageMonths: string;
  dateOfBirth: string;
  onAgeYearsChange: (v: string) => void;
  onAgeMonthsChange: (v: string) => void;
  onChangeDate: (iso: string) => void;
  onClearDate: () => void;
  ageOrDobError: boolean;
};

export default function PetAgeOrDobSection({
  ageYears,
  ageMonths,
  dateOfBirth,
  onAgeYearsChange,
  onAgeMonthsChange,
  onChangeDate,
  onClearDate,
  ageOrDobError,
}: PetAgeOrDobSectionProps) {
  return (
    <View style={styles.section}>
      <Text
        style={[styles.fieldLabel, ageOrDobError && styles.fieldLabelError]}
      >
        Age *
      </Text>
      <View style={styles.row}>
        <FormInput
          placeholder="Years"
          value={ageYears}
          onChangeText={onAgeYearsChange}
          keyboardType="numeric"
          containerStyle={styles.halfInput}
          error={ageOrDobError}
        />

        <FormInput
          placeholder="Months"
          value={ageMonths}
          onChangeText={onAgeMonthsChange}
          keyboardType="numeric"
          containerStyle={styles.halfInput}
          error={ageOrDobError}
        />
      </View>
      <Text style={styles.orText}>or</Text>
      <PetDateOfBirthField
        dateOfBirth={dateOfBirth}
        onChangeDate={onChangeDate}
        onClearDate={onClearDate}
        error={ageOrDobError}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: PET_INFO_FIELD_MARGIN_BOTTOM,
  },
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
  },
  halfInput: {
    flex: 1,
  },
  orText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    marginVertical: 10,
  },
});
