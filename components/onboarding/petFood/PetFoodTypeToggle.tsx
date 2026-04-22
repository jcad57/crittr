import { petCareStyles as styles } from "@/components/onboarding/petCareStyles";
import { stepStyles } from "@/components/onboarding/PetFoodStep.styles";
import { Pressable, Text, View } from "react-native";

type Props = {
  isTreat: boolean;
  onSelectMeal: () => void;
  onSelectTreat: () => void;
};

export default function PetFoodTypeToggle({
  isTreat,
  onSelectMeal,
  onSelectTreat,
}: Props) {
  return (
    <>
      <Text style={styles.fieldLabel}>Type</Text>
      <View style={stepStyles.typeRow}>
        <Pressable
          style={[
            stepStyles.typeToggle,
            !isTreat && stepStyles.typeToggleMealActive,
          ]}
          onPress={() => {
            if (isTreat) {
              onSelectMeal();
            }
          }}
        >
          <Text
            style={[
              stepStyles.typeToggleText,
              !isTreat && stepStyles.typeToggleTextMeal,
            ]}
          >
            Meal
          </Text>
        </Pressable>
        <Pressable
          style={[
            stepStyles.typeToggle,
            isTreat && stepStyles.typeToggleTreatActive,
          ]}
          onPress={() => {
            if (!isTreat) {
              onSelectTreat();
            }
          }}
        >
          <Text
            style={[
              stepStyles.typeToggleText,
              isTreat && stepStyles.typeToggleTextTreat,
            ]}
          >
            Treat
          </Text>
        </Pressable>
      </View>
    </>
  );
}
