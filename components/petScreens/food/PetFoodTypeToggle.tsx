import { styles } from "@/screen-styles/pet/[id]/food/[foodId].styles";
import { Pressable, Text, View } from "react-native";

type Props = {
  isTreat: boolean;
  onChange: (nextIsTreat: boolean) => void;
};

export default function PetFoodTypeToggle({ isTreat, onChange }: Props) {
  return (
    <>
      <Text style={styles.fieldLabel}>Type</Text>
      <View style={styles.row2}>
        <Pressable
          style={[styles.typeToggle, !isTreat && styles.typeToggleActive]}
          onPress={() => onChange(false)}
        >
          <Text
            style={[
              styles.typeToggleText,
              !isTreat && styles.typeToggleTextActive,
            ]}
          >
            Meal
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.typeToggle,
            isTreat && styles.typeToggleActiveTreat,
          ]}
          onPress={() => onChange(true)}
        >
          <Text
            style={[
              styles.typeToggleText,
              isTreat && styles.typeToggleTextActiveTreat,
            ]}
          >
            Treat
          </Text>
        </Pressable>
      </View>
    </>
  );
}
