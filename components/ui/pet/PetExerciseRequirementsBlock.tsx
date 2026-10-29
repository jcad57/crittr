import SectionLabel from "@/components/ui/dashboard/SectionLabel";
import { createThemeValues, useThemeValues } from "@/theme/colors";
import { shouldShowExerciseField } from "@/constants/petInfo";
import { Font } from "@/theme/typography";
import { useUserDateTimePrefs } from "@/hooks/useUserDateTimePrefs";
import type { PetWithDetails } from "@/types/database";
import {
  formatExercisePlanSubline,
} from "@/utils/exercisePlans";
import { formatEnergyLabel } from "@/utils/petDisplay";
import { formatFeedTimeLabel } from "@/utils/petFoodTime";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import type { Href } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type RowProps = { label: string; value: string; isLast?: boolean };

function SummaryRow({ label, value, isLast }: RowProps) {
  const styles = useThemeValues(getStyles);
  return (
    <View style={[styles.infoRow, isLast && styles.infoRowLast]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={4}>
        {value || "—"}
      </Text>
    </View>
  );
}

type Props = {
  details: PetWithDetails;
  /** When false, hides the Edit link (e.g. co-carer without profile edit permission). */
  canEdit?: boolean;
};

export default function PetExerciseRequirementsBlock({
  details,
  canEdit = true,
}: Props) {
  const styles = useThemeValues(getStyles);
  const { push } = useNavigationCooldown();
  const { timeDisplay } = useUserDateTimePrefs();
  const showActivities = shouldShowExerciseField(details.pet_type ?? "");
  const plans = details.exercise_plans ?? [];

  return (
    <>
      <View style={styles.sectionHeaderRow}>
        <SectionLabel style={styles.sectionLabelInline}>
          Exercise &amp; Potty
        </SectionLabel>
        {canEdit ? (
          <TouchableOpacity
            hitSlop={8}
            onPress={() =>
              push(
                `/(logged-in)/pet/${details.id}/exercise-requirements` as Href,
              )
            }
          >
            <Text style={styles.sectionEditLink}>Edit</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.editPlaceholder} />
        )}
      </View>
      <View style={styles.detailsCard}>
        <SummaryRow
          label="Energy level"
          value={formatEnergyLabel(details.energy_level)}
        />
        {showActivities ? (
          plans.length > 0 ? (
            plans.map((p) => (
              <SummaryRow
                key={p.id}
                label={p.label}
                value={formatExercisePlanSubline(p, timeDisplay)}
              />
            ))
          ) : (
            <SummaryRow
              label="Activities"
              value="—"
            />
          )
        ) : null}
        <SummaryRow label="Potty breaks" value={(details.potty_times ?? []).map((time) => formatFeedTimeLabel(time, timeDisplay)).join(", ") || "Not scheduled"} isLast />
      </View>
    </>
  );
}

const getStyles = createThemeValues((Colors) => StyleSheet.create({
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 0,
    width: "100%",
  },
  sectionLabelInline: {
    marginBottom: 0,
    flexShrink: 1,
  },
  sectionEditLink: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.orange,
  },
  editPlaceholder: {
    minWidth: 36,
    minHeight: 22,
  },
  detailsCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray100,
    gap: 12,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.sectionLabel,
    flexShrink: 0,
    minWidth: 100,
  },
  infoValue: {
    fontFamily: Font.uiMedium,
    fontSize: 15,
    color: Colors.textPrimary,
    textAlign: "right",
    flex: 1,
  },
}));
