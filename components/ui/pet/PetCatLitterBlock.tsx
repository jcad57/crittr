import SectionLabel from "@/components/ui/dashboard/SectionLabel";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import type { PetWithDetails } from "@/types/database";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import type { Href } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

function formatPeriodLabel(
  p: NonNullable<PetWithDetails["litter_cleaning_period"]>,
): string {
  if (p === "day") return "Daily";
  if (p === "week") return "Weekly";
  return "Monthly";
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
  canEdit?: boolean;
};

export default function PetCatLitterBlock({
  details,
  canEdit = true,
}: Props) {
  const { push } = useNavigationCooldown();

  const period = details.litter_cleaning_period;
  const n = details.litter_cleanings_per_period;
  const periodLine = period ? formatPeriodLabel(period) : "—";
  const countLine =
    n != null && n > 0 ? String(n) : "—";

  return (
    <>
      <View style={styles.sectionHeaderRow}>
        <SectionLabel style={styles.sectionLabelInline}>
          Litter box
        </SectionLabel>
        {canEdit ? (
          <TouchableOpacity
            hitSlop={8}
            onPress={() =>
              push(
                `/(logged-in)/pet/${details.id}/litter-maintenance` as Href,
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
        <SummaryRow label="Tracking interval" value={periodLine} />
        <SummaryRow
          label="Cleanings per interval"
          value={countLine}
          isLast
        />
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
