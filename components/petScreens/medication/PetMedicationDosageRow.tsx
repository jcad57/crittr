import { styles } from "@/screen-styles/pet/[id]/medications/[medicationId].styles";
import DropdownSelect from "@/components/onboarding/DropdownSelect";
import FormInput from "@/components/onboarding/FormInput";
import { DOSAGE_TYPES } from "@/constants/medicationEditForm";
import { Text, View } from "react-native";

type Props = {
  dosageAmount: string;
  setDosageAmount: (v: string) => void;
  dosageType: string;
  setDosageType: (v: string) => void;
  dosageAmountError?: boolean;
  dosageTypeError?: boolean;
};

export default function PetMedicationDosageRow({
  dosageAmount,
  setDosageAmount,
  dosageType,
  setDosageType,
  dosageAmountError,
  dosageTypeError,
}: Props) {
  const dosageLabelError = Boolean(dosageAmountError || dosageTypeError);
  return (
    <>
      <Text
        style={[
          styles.fieldLabel,
          dosageLabelError && styles.fieldLabelError,
        ]}
      >
        Dosage *
      </Text>
      <View style={styles.row2}>
        <FormInput
          placeholder="Amt"
          value={dosageAmount}
          onChangeText={setDosageAmount}
          keyboardType="default"
          containerStyle={styles.smallInput}
          error={dosageAmountError}
        />
        <View style={{ flex: 1, zIndex: 40 }}>
          <DropdownSelect
            placeholder="Type"
            value={dosageType}
            options={DOSAGE_TYPES}
            onSelect={setDosageType}
            error={dosageTypeError}
          />
        </View>
      </View>
    </>
  );
}
