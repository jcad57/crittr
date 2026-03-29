import MedicationListRow from "@/components/ui/medication/MedicationListRow";
import type { Medication } from "@/data/mockDashboard";

type MedicationCardProps = {
  medication: Medication;
  onPress?: () => void;
  /** When shown inside a grouped list (e.g. Health tab), omit bottom border on last row */
  isLast?: boolean;
};

export default function MedicationCard({
  medication,
  onPress,
  isLast,
}: MedicationCardProps) {
  const subline = [medication.frequency, medication.condition, medication.dosageDesc]
    .filter((s) => s && String(s).trim())
    .join(" · ");

  return (
    <MedicationListRow
      title={medication.name}
      subline={subline}
      badgeKind={medication.badgeKind}
      badgeLabel={medication.badgeLabel}
      onPress={onPress}
      isLast={isLast}
    />
  );
}
