import type { PetMedication } from "@/types/database";
import type { HealthTrafficKind } from "@/utils/healthTraffic";
import { medicationTraffic } from "@/utils/healthTraffic";
import type { MedicationDosageProgress } from "@/utils/medicationDosageProgress";
import type { UserDateDisplay } from "@/utils/userDateTimeFormat";

/**
 * Badge label + traffic kind for a medication row, matching Health tab behavior:
 * when today has a dose schedule (total &gt; 0), show "n/m" and completion coloring.
 */
export function getMedicationBadgeDisplay(
  m: PetMedication,
  prog: MedicationDosageProgress,
  dateDisplay: UserDateDisplay = "mdy",
): { kind: HealthTrafficKind; label: string } {
  const t = medicationTraffic(m, dateDisplay);
  if (prog.total > 0) {
    return {
      kind: prog.isComplete ? "current" : "due_today",
      label: `${prog.current}/${prog.total}`,
    };
  }
  return { kind: t.kind, label: t.label };
}
