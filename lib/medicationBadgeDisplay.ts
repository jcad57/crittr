import type { HealthTrafficKind } from "@/lib/healthTraffic";
import { medicationTraffic } from "@/lib/healthTraffic";
import type { MedicationDosageProgress } from "@/lib/medicationDosageProgress";
import type { PetMedication } from "@/types/database";

/**
 * Badge label + traffic kind for a medication row, matching Health tab behavior:
 * when today has a dose schedule (total &gt; 0), show "n/m" and completion coloring.
 */
export function getMedicationBadgeDisplay(
  m: PetMedication,
  prog: MedicationDosageProgress,
): { kind: HealthTrafficKind; label: string } {
  const t = medicationTraffic(m);
  if (prog.total > 0) {
    return {
      kind: prog.isComplete ? "current" : "due_today",
      label: `${prog.current}/${prog.total}`,
    };
  }
  return { kind: t.kind, label: t.label };
}
