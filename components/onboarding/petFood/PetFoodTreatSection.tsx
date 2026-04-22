import FormInput from "@/components/onboarding/FormInput";
import { petCareStyles as styles } from "@/components/onboarding/petCareStyles";
import { stepStyles } from "@/components/onboarding/PetFoodStep.styles";
import {
  PORTION_UNITS,
  TIMES_QUICK,
} from "@/constants/petFoodFormConstants";
import { Pressable, Text, View } from "react-native";

type Props = {
  portionSize: string;
  setPortionSize: (v: string) => void;
  portionUnit: string;
  setPortionUnit: (v: string) => void;
  timesPerDay: string;
  setTimesPerDay: (v: string) => void;
  timesError: boolean;
};

export default function PetFoodTreatSection({
  portionSize,
  setPortionSize,
  portionUnit,
  setPortionUnit,
  timesPerDay,
  setTimesPerDay,
  timesError,
}: Props) {
  return (
    <>
      <Text style={styles.fieldLabel}>Portion</Text>
      <View style={stepStyles.row2}>
        <FormInput
          placeholder="Amount"
          value={portionSize}
          onChangeText={setPortionSize}
          keyboardType="decimal-pad"
          containerStyle={stepStyles.portionAmt}
        />
        <View style={stepStyles.portionUnits}>
          {PORTION_UNITS.map((unit, i) => (
            <Pressable
              key={unit}
              style={[
                stepStyles.unitChip,
                i < PORTION_UNITS.length - 1 &&
                  stepStyles.unitChipBorder,
                portionUnit === unit && stepStyles.unitChipActive,
              ]}
              onPress={() => setPortionUnit(unit)}
            >
              <Text
                style={[
                  stepStyles.unitChipText,
                  portionUnit === unit &&
                    stepStyles.unitChipTextActive,
                ]}
              >
                {unit}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Text
        style={[
          styles.fieldLabel,
          timesError && styles.fieldLabelError,
        ]}
      >
        Times per day *
      </Text>
      <View style={stepStyles.timesRow}>
        {TIMES_QUICK.map((t) => (
          <Pressable
            key={t}
            style={[
              stepStyles.timeChip,
              timesPerDay === t && stepStyles.timeChipActive,
            ]}
            onPress={() => setTimesPerDay(t)}
          >
            <Text
              style={[
                stepStyles.timeChipText,
                timesPerDay === t && stepStyles.timeChipTextActive,
              ]}
            >
              {t}×
            </Text>
          </Pressable>
        ))}
      </View>
    </>
  );
}
