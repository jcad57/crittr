import FormInput from "@/components/onboarding/FormInput";
import { authOnboardingStyles } from "@/constants/authOnboardingStyles";
import { Colors } from "@/constants/colors";
import { PET_INFO_FIELD_MARGIN_BOTTOM } from "@/constants/petInfo";
import { Font } from "@/constants/typography";
import type { LitterCleaningPeriod } from "@/types/database";
import { Pressable, StyleSheet, Text, View } from "react-native";

const PERIOD_OPTIONS: { id: LitterCleaningPeriod; label: string }[] = [
  { id: "day", label: "Daily" },
  { id: "week", label: "Weekly" },
  { id: "month", label: "Monthly" },
];

type Props = {
  litterCleaningPeriod: LitterCleaningPeriod | "";
  litterCleaningsPerPeriod: string;
  onPeriodChange: (p: LitterCleaningPeriod) => void;
  onCleaningsChange: (v: string) => void;
  periodError?: boolean;
  cleaningsError?: boolean;
};

export default function PetCatLitterSection({
  litterCleaningPeriod,
  litterCleaningsPerPeriod,
  onPeriodChange,
  onCleaningsChange,
  periodError,
  cleaningsError,
}: Props) {
  const periodLabel =
    litterCleaningPeriod === "week"
      ? "week"
      : litterCleaningPeriod === "month"
        ? "month"
        : "day";

  return (
    <View style={styles.block}>
      <Text style={authOnboardingStyles.sectionTitle}>Litter box</Text>
      <Text style={styles.hint}>
        How often do you want to track cleanings? We&apos;ll show progress under
        Maintenance on the dashboard.
      </Text>

      <Text style={styles.fieldLabel}>Frequency</Text>
      <View style={styles.chipRow}>
        {PERIOD_OPTIONS.map((opt) => {
          const on = litterCleaningPeriod === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => onPeriodChange(opt.id)}
              style={({ pressed }) => [
                styles.chip,
                on && styles.chipOn,
                pressed && styles.chipPressed,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {periodError ? (
        <Text style={styles.inlineError}>Choose daily, weekly, or monthly</Text>
      ) : null}

      <FormInput
        label={`Cleanings per ${periodLabel}`}
        required
        placeholder="e.g. 1, 2, 3"
        value={litterCleaningsPerPeriod}
        onChangeText={onCleaningsChange}
        keyboardType="number-pad"
        containerStyle={styles.inputSpacing}
        error={cleaningsError}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginBottom: 8,
  },
  hint: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: PET_INFO_FIELD_MARGIN_BOTTOM,
  },
  fieldLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },
  chip: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  chipOn: {
    borderColor: Colors.orange,
    backgroundColor: Colors.orangeLight,
  },
  chipPressed: {
    opacity: 0.88,
  },
  chipText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  chipTextOn: {
    color: Colors.orangeDark,
  },
  inlineError: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.error,
    marginBottom: 8,
  },
  inputSpacing: {
    marginTop: 4,
    marginBottom: PET_INFO_FIELD_MARGIN_BOTTOM,
  },
});
