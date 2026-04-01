import SectionLabel from "@/components/ui/dashboard/SectionLabel";
import { Colors } from "@/constants/colors";
import { shouldShowExerciseField } from "@/constants/petInfo";
import { Font } from "@/constants/typography";
import type { PetExercise, PetWithDetails } from "@/types/database";
import { formatEnergyLabel } from "@/utils/petDisplay";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

/** Optional rows from `pet_exercises` when present (e.g. future imports or API). */
function formatExerciseExtrasLine(ex: PetExercise | null): string | null {
  if (!ex) return null;
  const parts: string[] = [];
  if (ex.walks_per_day != null && ex.walks_per_day > 0) {
    parts.push(
      `${ex.walks_per_day} walk${ex.walks_per_day === 1 ? "" : "s"}/day`,
    );
  }
  if (ex.walk_duration_minutes != null && ex.walk_duration_minutes > 0) {
    parts.push(`~${ex.walk_duration_minutes} min per walk`);
  }
  if (ex.activities?.length) {
    parts.push(ex.activities.filter(Boolean).join(", "));
  }
  return parts.length ? parts.join(" · ") : null;
}

type RowProps = { label: string; value: string; isLast?: boolean };

function SummaryRow({ label, value, isLast }: RowProps) {
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
};

export default function PetExerciseRequirementsBlock({ details }: Props) {
  const router = useRouter();
  const showExerciseCount = shouldShowExerciseField(details.pet_type ?? "");
  const extrasLine = formatExerciseExtrasLine(details.exercise);

  const activitiesLine =
    details.exercises_per_day != null && details.exercises_per_day > 0
      ? `${details.exercises_per_day}`
      : showExerciseCount
        ? "—"
        : "Not tracked for this species";

  return (
    <>
      <View style={styles.sectionHeaderRow}>
        <SectionLabel style={styles.sectionLabelInline}>
          Exercise requirements
        </SectionLabel>
        <TouchableOpacity
          hitSlop={8}
          onPress={() =>
            router.push(
              `/(logged-in)/pet/${details.id}/exercise-requirements` as Href,
            )
          }
        >
          <Text style={styles.sectionEditLink}>Edit</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.detailsCard}>
        <SummaryRow
          label="Energy level"
          value={formatEnergyLabel(details.energy_level)}
        />
        <SummaryRow
          label="Target activities per day"
          value={activitiesLine}
          isLast={!extrasLine}
        />
        {extrasLine ? (
          <SummaryRow label="Activity detail" value={extrasLine} isLast />
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
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
    minWidth: 120,
  },
  infoValue: {
    fontFamily: Font.uiMedium,
    fontSize: 15,
    color: Colors.textPrimary,
    textAlign: "right",
    flex: 1,
  },
});
