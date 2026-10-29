import { useUserDateTimePrefs } from "@/hooks/useUserDateTimePrefs";
import { createThemeValues, useThemeColors, useThemeValues } from "@/theme/colors";
import { Font } from "@/theme/typography";
import { toLocalYmd } from "@/utils/medicationDueSchedule";
import {
  clampCustomMonthInterval,
  frequencyHelperText,
  frequencyLabelForDraft,
  frequencyReminderShortText,
  MAX_CUSTOM_MONTH_INTERVAL,
  MEDICATION_FREQUENCY_OPTIONS,
  MIN_CUSTOM_MONTH_INTERVAL,
  nextDueYmdFromDraft,
  type MedicationFrequencyDraft,
  type MedicationFrequencyKind,
} from "@/utils/medicationFrequency";
import { formatUserMediumDateFromYmd } from "@/utils/userDateTimeFormat";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const ANIM_MS = 280;

type Props = {
  draft: MedicationFrequencyDraft;
  onChange: (draft: MedicationFrequencyDraft) => void;
  lastGivenOn: string;
};

export default function PetMedicationFrequencySection({
  draft,
  onChange,
  lastGivenOn,
}: Props) {
  const Colors = useThemeColors();
  const styles = useThemeValues(getStyles);
  const { dateDisplay } = useUserDateTimePrefs();
  const [expanded, setExpanded] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const openHeight = useSharedValue(0);
  const chevronTurn = useSharedValue(0);

  const nextDueYmd =
    nextDueYmdFromDraft(draft, lastGivenOn) ?? toLocalYmd(new Date());
  const nextDueLabel =
    formatUserMediumDateFromYmd(nextDueYmd, dateDisplay) || nextDueYmd;
  const summaryLabel = frequencyLabelForDraft(draft);
  const collapsedHint = frequencyReminderShortText(draft);
  const expandedHint = frequencyHelperText(draft.kind);

  useEffect(() => {
    openHeight.value = withTiming(expanded ? contentHeight : 0, {
      duration: ANIM_MS,
      easing: Easing.out(Easing.cubic),
    });
    chevronTurn.value = withTiming(expanded ? 1 : 0, {
      duration: ANIM_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [expanded, contentHeight, openHeight, chevronTurn]);

  const bodyStyle = useAnimatedStyle(() => ({
    height: openHeight.value,
    overflow: "hidden",
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronTurn.value * -180}deg` }],
  }));

  const selectKind = (kind: MedicationFrequencyKind) => {
    onChange({
      kind,
      monthInterval:
        kind === "every_n_months"
          ? clampCustomMonthInterval(draft.monthInterval)
          : draft.monthInterval,
    });
  };

  const stepMonths = (delta: number) => {
    onChange({
      ...draft,
      kind: "every_n_months",
      monthInterval: clampCustomMonthInterval(draft.monthInterval + delta),
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <MaterialCommunityIcons
          name="calendar-month-outline"
          size={22}
          color={Colors.sectionLabel}
        />
        <View style={styles.topCopy}>
          <Text style={styles.sectionLabel}>Frequency</Text>
          <Text style={styles.howOften}>How often?</Text>
        </View>
        <View style={styles.summaryPill} accessibilityLabel={summaryLabel}>
          <Text style={styles.summaryPillText} numberOfLines={1}>
            {summaryLabel}
          </Text>
        </View>
      </View>

      <Animated.View style={[styles.bodyAnim, bodyStyle]}>
        <View
          collapsable={false}
          style={styles.measureBox}
          onLayout={(e) => {
            const h = Math.ceil(e.nativeEvent.layout.height);
            if (h > 0 && h !== contentHeight) setContentHeight(h);
          }}
        >
          <View style={styles.chipWrap}>
            {MEDICATION_FREQUENCY_OPTIONS.map((opt) => {
              const selected = draft.kind === opt.kind;
              return (
                <Pressable
                  key={opt.kind}
                  onPress={() => selectKind(opt.kind)}
                  style={({ pressed }) => [
                    styles.chip,
                    selected && styles.chipSelected,
                    pressed && styles.chipPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={opt.label}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selected && styles.chipTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {draft.kind === "every_n_months" ? (
            <View style={styles.stepperRow}>
              <Pressable
                onPress={() => stepMonths(-1)}
                disabled={draft.monthInterval <= MIN_CUSTOM_MONTH_INTERVAL}
                style={({ pressed }) => [
                  styles.stepperBtn,
                  draft.monthInterval <= MIN_CUSTOM_MONTH_INTERVAL &&
                    styles.stepperBtnDisabled,
                  pressed && styles.chipPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Fewer months"
              >
                <MaterialCommunityIcons
                  name="minus"
                  size={22}
                  color={
                    draft.monthInterval <= MIN_CUSTOM_MONTH_INTERVAL
                      ? Colors.gray400
                      : Colors.orange
                  }
                />
              </Pressable>
              <Text style={styles.stepperValue}>
                Every {draft.monthInterval} months
              </Text>
              <Pressable
                onPress={() => stepMonths(1)}
                disabled={draft.monthInterval >= MAX_CUSTOM_MONTH_INTERVAL}
                style={({ pressed }) => [
                  styles.stepperBtn,
                  draft.monthInterval >= MAX_CUSTOM_MONTH_INTERVAL &&
                    styles.stepperBtnDisabled,
                  pressed && styles.chipPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="More months"
              >
                <MaterialCommunityIcons
                  name="plus"
                  size={22}
                  color={
                    draft.monthInterval >= MAX_CUSTOM_MONTH_INTERVAL
                      ? Colors.gray400
                      : Colors.orange
                  }
                />
              </Pressable>
            </View>
          ) : null}
        </View>
      </Animated.View>

      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [
          styles.nextRow,
          expanded && styles.nextRowExpanded,
          pressed && styles.nextRowPressed,
        ]}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`Next dose ${nextDueLabel}. ${expanded ? expandedHint : collapsedHint}`}
        accessibilityHint={
          expanded
            ? "Collapses frequency options"
            : "Expands to edit how often this medication is given"
        }
      >
        <MaterialCommunityIcons
          name="clock-outline"
          size={20}
          color={expanded ? Colors.orange : Colors.sectionLabel}
        />
        <View style={styles.nextCopy}>
          <View style={styles.nextTitleRow}>
            <Text style={styles.nextLabel}>Next dose</Text>
            <Text
              style={[styles.nextDate, expanded && styles.nextDateExpanded]}
              numberOfLines={1}
            >
              {nextDueLabel}
            </Text>
            <Animated.View style={chevronStyle}>
              <MaterialCommunityIcons
                name="chevron-down"
                size={22}
                color={Colors.gray400}
              />
            </Animated.View>
          </View>
          <Text style={styles.nextHint}>
            {expanded ? expandedHint : collapsedHint}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const getStyles = createThemeValues((Colors) => StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.gray200,
    overflow: "hidden",
    marginBottom: 20,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  topCopy: {
    flex: 1,
    minWidth: 0,
  },
  sectionLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: Colors.sectionLabel,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  howOften: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  summaryPill: {
    maxWidth: "42%",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.orange,
    backgroundColor: Colors.white,
  },
  summaryPillText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.orange,
  },
  bodyAnim: {
    position: "relative",
    width: "100%",
  },
  measureBox: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  chipSelected: {
    backgroundColor: Colors.orange,
    borderColor: Colors.orange,
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipText: {
    fontFamily: Font.uiMedium,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    fontFamily: Font.uiSemiBold,
    color: Colors.white,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.orange,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnDisabled: {
    borderColor: Colors.gray200,
  },
  stepperValue: {
    flex: 1,
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  nextRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.gray200,
  },
  nextRowExpanded: {
    backgroundColor: Colors.orangeLight,
    borderTopWidth: 0,
  },
  nextRowPressed: {
    opacity: 0.92,
  },
  nextCopy: {
    flex: 1,
    minWidth: 0,
  },
  nextTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nextLabel: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  nextDate: {
    flex: 1,
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  nextDateExpanded: {
    color: Colors.orange,
  },
  nextHint: {
    marginTop: 4,
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.gray500,
    lineHeight: 18,
    paddingRight: 8,
  },
}));
