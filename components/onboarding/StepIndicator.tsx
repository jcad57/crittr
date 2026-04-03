import { Colors } from "@/constants/colors";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

type StepIndicatorProps = {
  totalSteps: number;
  currentStep: number;
  /** Merged with container (e.g. welcome carousel spacing). */
  style?: StyleProp<ViewStyle>;
};

export default function StepIndicator({
  totalSteps,
  currentStep,
  style,
}: StepIndicatorProps) {
  return (
    <View style={[styles.container, style]}>
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
    paddingBottom: 16,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: Colors.gray300,
  },
  dotActive: {
    backgroundColor: Colors.orange,
    width: 24,
    borderRadius: 4,
  },
});
