import type { Pet } from "@/types/database";

/** Pets that can be selected on the dashboard, for activities, and as the “active” pet. */
export function isPetActiveForDashboard(p: Pet): boolean {
  return p.is_memorialized !== true;
}
