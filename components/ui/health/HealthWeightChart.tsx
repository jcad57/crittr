import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import type { WeightBarPoint } from "@/utils/healthWeightSeries";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  /** Values in the same unit (e.g. lbs). */
  points: WeightBarPoint[];
  unitLabel: string;
};

export default function HealthWeightChart({ points, unitLabel }: Props) {
  if (points.length === 0) {
    return (
      <Text style={styles.empty}>No weight history for this pet yet.</Text>
    );
  }

  const max = Math.max(...points.map((p) => p.value), 0.0001);
  const barAreaHeight = 120;

  return (
    <View style={styles.wrap}>
      <View style={[styles.bars, { height: barAreaHeight }]}>
        {points.map((p, i) => {
          const h = Math.max(8, (p.value / max) * barAreaHeight);
          return (
            <View key={`${p.label}-${i}`} style={styles.barCol}>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: h }]} />
              </View>
              <Text style={styles.barLabel} numberOfLines={1}>
                {p.label}
              </Text>
              <Text style={styles.barValue} numberOfLines={1}>
                {p.value}
              </Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.unitHint}>Unit: {unitLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 6,
    paddingHorizontal: 4,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    minWidth: 0,
  },
  barTrack: {
    width: "100%",
    maxWidth: 40,
    height: 120,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  barFill: {
    width: "100%",
    borderRadius: 8,
    backgroundColor: Colors.orange,
    minHeight: 8,
  },
  barLabel: {
    fontFamily: Font.uiRegular,
    fontSize: 10,
    color: Colors.gray500,
    marginTop: 6,
    textAlign: "center",
  },
  barValue: {
    fontFamily: Font.uiSemiBold,
    fontSize: 11,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  unitHint: {
    fontFamily: Font.uiRegular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  empty: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    textAlign: "center",
    paddingVertical: 12,
  },
});
