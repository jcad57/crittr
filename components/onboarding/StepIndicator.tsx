import { Colors } from "@/constants/colors";
import { StyleSheet, View } from "react-native";

type StepIndicatorProps = {
  totalSteps: number;
  currentStep: number;
};

export default function StepIndicator({
  totalSteps,
  currentStep,
}: StepIndicatorProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: totalSteps }, (_, i) => (
        <View
          key={i}
          style={[styles.dot, i === currentStep && styles.dotActive]}
        />
      ))}
    </View>
  );
}

const DOT_SIZE = 8;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: Colors.gray200,
  },
  dotActive: {
    backgroundColor: Colors.orange,
    width: 24,
    borderRadius: 4,
  },
});
