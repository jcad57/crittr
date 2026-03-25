import FormInput from "@/components/onboarding/FormInput";
import { Colors } from "@/constants/colors";
import { PET_INFO_FIELD_MARGIN_BOTTOM } from "@/constants/petInfo";
import { StyleSheet, Text, View } from "react-native";

type PetAgeFieldsProps = {
  ageYears: string;
  ageMonths: string;
  onAgeYearsChange: (v: string) => void;
  onAgeMonthsChange: (v: string) => void;
  ageYearsError: boolean;
};

export default function PetAgeFields({
  ageYears,
  ageMonths,
  onAgeYearsChange,
  onAgeMonthsChange,
  ageYearsError,
}: PetAgeFieldsProps) {
  return (
    <>
      <Text
        style={[styles.fieldLabel, ageYearsError && styles.fieldLabelError]}
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
          error={ageYearsError}
        />
        <FormInput
          placeholder="Months"
          value={ageMonths}
          onChangeText={onAgeMonthsChange}
          keyboardType="numeric"
          containerStyle={styles.halfInput}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    fontFamily: "InstrumentSans-SemiBold",
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
  halfInput: {
    flex: 1,
  },
});
