import MedicationListRow from "@/components/ui/medication/MedicationListRow";
import { getMedicationBadgeDisplay } from "@/utils/medicationBadgeDisplay";
import type { MedicationDosageProgress } from "@/utils/medicationDosageProgress";
import type { MedicationWithPet } from "@/services/health";

type Props = {
  item: MedicationWithPet;
  isLast?: boolean;
  onPress: () => void;
  /** Today's dose progress, e.g. "2/2". When set, badge reflects completion vs traffic. */
  dosageLabel?: string;
  /** True when today's required doses are logged (only with dosageLabel). */
  dosageComplete?: boolean;
};

function formatSubline(m: MedicationWithPet): string {
  const parts = [m.frequency, m.dosage, m.condition].filter(
    (s) => s && String(s).trim(),
  );
  return [m.pet.name, ...parts].join(" · ");
}

export default function HealthMedicationRow({
  item,
  isLast,
  onPress,
  dosageLabel,
  dosageComplete,
}: Props) {
  const useDosageBadge =
    dosageLabel != null &&
    dosageLabel.length > 0 &&
    dosageComplete !== undefined;

  const badge = useDosageBadge
    ? (() => {
        const parts = dosageLabel.split("/");
        const cur = parseInt(parts[0] ?? "0", 10);
        const tot = parseInt(parts[1] ?? "0", 10);
        const prog: MedicationDosageProgress = {
          current: Number.isFinite(cur) ? cur : 0,
          total: Number.isFinite(tot) ? tot : 0,
          isComplete: Boolean(dosageComplete),
        };
        return getMedicationBadgeDisplay(item, prog);
      })()
    : getMedicationBadgeDisplay(item, {
        current: 0,
        total: 0,
        isComplete: true,
      });

  return (
    <MedicationListRow
      title={item.name}
      subline={formatSubline(item)}
      badgeKind={badge.kind}
      badgeLabel={badge.label}
      onPress={onPress}
      isLast={isLast}
    />
  );
}
