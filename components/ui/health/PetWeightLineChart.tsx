import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import {
  formatChartDateLabel,
  spanDays,
  type WeightChartPoint,
} from "@/utils/petWeightHistory";
import { useCallback, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import { LineChart } from "react-native-gifted-charts";

type Props = {
  points: WeightChartPoint[];
  unitLabel: string;
};

const MIN_CHART_WIDTH = 280;
const RIGHT_AXIS_PADDING = 40;
const LEFT_PADDING = 12;

/** ~ 5 vertical sections looks good across 1W → 1Y ranges with sensible step rounding. */
const TARGET_SECTIONS = 5;
const NICE_STEPS = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100];

type AxisConfig = {
  yMin: number;
  yMax: number;
  noOfSections: number;
  stepValue: number;
};

function buildAxisConfig(values: number[]): AxisConfig {
  if (values.length === 0) {
    return { yMin: 0, yMax: 10, noOfSections: TARGET_SECTIONS, stepValue: 2 };
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max((max - min) * 0.15, max * 0.05, 0.5);
  let yMin = Math.max(0, Math.floor(min - pad));
  let yMax = Math.ceil(max + pad);
  if (yMax === yMin) yMax = yMin + 1;
  const rawStep = (yMax - yMin) / TARGET_SECTIONS;
  const stepValue = NICE_STEPS.find((s) => s >= rawStep) ?? rawStep;
  yMin = Math.floor(yMin / stepValue) * stepValue;
  yMax = Math.ceil(yMax / stepValue) * stepValue;
  if (yMax - yMin === 0) yMax += stepValue;
  const noOfSections = Math.max(1, Math.round((yMax - yMin) / stepValue));
  return { yMin, yMax, noOfSections, stepValue };
}

function buildLabels(points: WeightChartPoint[]): (string | undefined)[] {
  const total = points.length;
  if (total === 0) return [];
  const showYear = spanDays(points) > 320;
  const targetLabels = Math.min(6, total);
  const stride = Math.max(1, Math.floor((total - 1) / (targetLabels - 1 || 1)));
  return points.map((p, i) =>
    i === 0 || i === total - 1 || i % stride === 0
      ? formatChartDateLabel(p.ts, showYear)
      : undefined,
  );
}

/**
 * `react-native-gifted-charts` mutates the data items it receives — its
 * internal `clone()` helper temporarily writes `obj.isActiveClone = null`
 * on each item and then `delete`s it. The React Compiler (enabled by Expo)
 * deep-freezes `useMemo` return values in development, so any data array
 * we passed via `useMemo` would crash the chart with
 * `TypeError: Cannot add new property 'isActiveClone'` and lock the screen.
 *
 * Opting this single component out of the React Compiler with `"use no
 * memo"` lets us own memoization manually, AND we deliberately rebuild the
 * `data` and `pointerConfig` props as plain mutable objects on every
 * render so gifted-charts can safely scribble on them.
 */
export default function PetWeightLineChart({ points, unitLabel }: Props) {
  "use no memo";

  const [width, setWidth] = useState<number>(0);

  /** Round the measured width to whole pixels so sub-pixel layout jitter
   *  during the chart's entrance animation can't loop us back through
   *  setWidth → recompute spacing → re-layout → onLayout → repeat. */
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const w = Math.floor(e.nativeEvent.layout.width);
      if (w > 0 && w !== width) setWidth(w);
    },
    [width],
  );

  /** Drop any non-finite values up front — those propagate as NaN through
   *  the chart's path math and produce broken SVG. */
  const safePoints = points.filter((p) => Number.isFinite(p.value));

  if (safePoints.length === 0) return null;

  const values = safePoints.map((p) => p.value);
  const axis = buildAxisConfig(values);
  const labels = buildLabels(safePoints);

  /**
   * Plain mutable items — gifted-charts will mutate `isActiveClone` on these
   * AND on every nested object value (it does a recursive deep clone). We
   * therefore keep each item to plain primitives only. Label styling is
   * applied globally via the top-level `xAxisLabelTextStyle` prop instead
   * of `labelTextStyle` per item, because `StyleSheet.create` returns dev-
   * frozen objects that would crash the recursive clone with
   * `Cannot add new property 'isActiveClone'`.
   */
  const data = safePoints.map((p, i) => {
    const item: { value: number; label?: string } = { value: p.value };
    const lbl = labels[i];
    if (lbl !== undefined) item.label = lbl;
    return item;
  });

  const chartWidth = Math.max(MIN_CHART_WIDTH, width - RIGHT_AXIS_PADDING);
  const spacing =
    safePoints.length > 1
      ? Math.max(20, Math.floor(chartWidth / (safePoints.length - 1)) - 1)
      : 0;

  /** Built fresh on every render so gifted-charts is free to mutate it. */
  const pointerConfig =
    safePoints.length > 1
      ? {
          pointerStripUptoDataPoint: true,
          pointerStripColor: Colors.gray300,
          pointerStripWidth: 1,
          strokeDashArray: [4, 4],
          pointerColor: Colors.orange,
          radius: 5,
          pointerLabelWidth: 120,
          pointerLabelHeight: 60,
          activatePointersOnLongPress: false,
          autoAdjustPointerLabelPosition: true,
          pointerLabelComponent: (
            items: { value: number; label?: string }[] | undefined,
          ) => {
            const item = items && items[0];
            if (!item) return null;
            const idx = data.findIndex(
              (d) => d.value === item.value && d.label === item.label,
            );
            const point = idx >= 0 ? safePoints[idx] : undefined;
            const dateLabel = point
              ? formatChartDateLabel(point.ts, true)
              : (item.label ?? "");
            return (
              <View style={styles.tooltip}>
                <Text style={styles.tooltipDate}>{dateLabel}</Text>
                <Text style={styles.tooltipValue}>
                  {item.value} {unitLabel}
                </Text>
              </View>
            );
          },
        }
      : undefined;

  return (
    <View style={styles.container} onLayout={onLayout}>
      {width > 0 ? (
        <LineChart
          areaChart
          data={data}
          color={Colors.orange}
          thickness={3}
          startFillColor={Colors.orange}
          endFillColor={Colors.orange}
          startOpacity={0.25}
          endOpacity={0.02}
          /** Y axis */
          yAxisOffset={axis.yMin}
          maxValue={axis.yMax - axis.yMin}
          noOfSections={axis.noOfSections}
          stepValue={axis.stepValue}
          yAxisColor={Colors.gray100}
          xAxisColor={Colors.gray100}
          rulesColor={Colors.gray100}
          rulesType="solid"
          yAxisTextStyle={styles.yAxisLabel}
          yAxisLabelSuffix={` ${unitLabel}`}
          /** X axis */
          spacing={spacing}
          initialSpacing={LEFT_PADDING}
          endSpacing={LEFT_PADDING}
          xAxisLabelTextStyle={styles.xAxisLabel}
          /** Data points */
          dataPointsColor={Colors.orange}
          dataPointsRadius={safePoints.length > 30 ? 0 : 4}
          /** Animations + interactions
           *  We intentionally skip `animateOnDataChange` — combined with
           *  `curved` + `areaChart` it kicks off an internal effect loop. */
          isAnimated
          animationDuration={400}
          curved
          curvature={0.18}
          pointerConfig={pointerConfig}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 16,
    paddingRight: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  yAxisLabel: {
    fontFamily: Font.uiRegular,
    fontSize: 11,
    color: Colors.gray500,
  },
  xAxisLabel: {
    fontFamily: Font.uiRegular,
    fontSize: 11,
    color: Colors.gray500,
  },
  tooltip: {
    backgroundColor: Colors.featureDark,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tooltipDate: {
    fontFamily: Font.uiRegular,
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 2,
  },
  tooltipValue: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.white,
  },
});
