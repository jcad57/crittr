import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import {
  WEIGHT_HISTORY_RANGE_OPTIONS,
  type WeightHistoryRange,
} from "@/utils/petWeightHistory";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  active: WeightHistoryRange;
  onChange: (range: WeightHistoryRange) => void;
};

/** Pill segmented control mirroring the chart card style — used above the chart. */
export default function WeightRangeSelector({ active, onChange }: Props) {
  return (
    <View style={styles.row}>
      {WEIGHT_HISTORY_RANGE_OPTIONS.map((opt) => {
        const selected = opt.id === active;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onChange(opt.id)}
            style={[styles.pill, selected && styles.pillActive]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`Show ${opt.label} of weight history`}
          >
            <Text style={[styles.label, selected && styles.labelActive]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: 4,
    gap: 4,
    alignSelf: "stretch",
    justifyContent: "space-between",
  },
  pill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  pillActive: {
    backgroundColor: Colors.orange,
  },
  label: {
    fontFamily: Font.uiSemiBold,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  labelActive: {
    color: Colors.white,
  },
});
