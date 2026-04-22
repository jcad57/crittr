import { styles } from "@/screen-styles/pet/[id]/food/[foodId].styles";
import FormInput from "@/components/onboarding/FormInput";
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
  mealsPerDay: string;
  setMealsPerDay: (v: string) => void;
  attempted: boolean;
  isValid: boolean;
};

export default function PetFoodTreatSection({
  portionSize,
  setPortionSize,
  portionUnit,
  setPortionUnit,
  mealsPerDay,
  setMealsPerDay,
  attempted,
  isValid,
}: Props) {
  return (
    <>
      <Text style={styles.fieldLabel}>Portion</Text>
      <View style={styles.row2}>
        <FormInput
          placeholder="Amount"
          value={portionSize}
          onChangeText={setPortionSize}
          keyboardType="decimal-pad"
          containerStyle={styles.portionAmt}
        />
        <View style={styles.portionUnits}>
          {PORTION_UNITS.map((unit, i) => (
            <Pressable
              key={unit}
              style={[
                styles.unitChip,
                i < PORTION_UNITS.length - 1 && styles.unitChipBorder,
                portionUnit === unit && styles.unitChipActive,
              ]}
              onPress={() => setPortionUnit(unit)}
            >
              <Text
                style={[
                  styles.unitChipText,
                  portionUnit === unit && styles.unitChipTextActive,
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
          attempted && !isValid && styles.fieldLabelError,
        ]}
      >
        Times per day *
      </Text>
      <View style={styles.timesRow}>
        {TIMES_QUICK.map((t) => (
          <Pressable
            key={t}
            style={[
              styles.timeChip,
              mealsPerDay === t && styles.timeChipActive,
            ]}
            onPress={() => setMealsPerDay(t)}
          >
            <Text
              style={[
                styles.timeChipText,
                mealsPerDay === t && styles.timeChipTextActive,
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
