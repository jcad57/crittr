import type { ActivityFilterCategory } from "@/data/activityHistory";

export type ActivityFilterMenuItem = {
  id: ActivityFilterCategory;
  label: string;
};

/**
 * Filter chips that appear in the activity tab dropdown. The list is keyed
 * to which activity types each pet type can actually log (see
 * `ActivityTypeStep`):
 *
 *   - Both:   exercise, meals, treats, meds, vet visits, weigh-ins
 *   - Dog:    + training, potty
 *   - Cat:    + maintenance (litter box upkeep)
 *
 * Treats are a sub-category of `food` (food + `is_treat=true`) and are
 * available for both pet types.
 */
export function activityFilterMenuItems(
  petType: string | null | undefined,
): ActivityFilterMenuItem[] {
  const shared: ActivityFilterMenuItem[] = [
    { id: "all", label: "All" },
    { id: "exercise", label: "Exercise" },
    { id: "meals", label: "Meals" },
    { id: "treats", label: "Treats" },
    { id: "meds", label: "Meds" },
    { id: "vet_visit", label: "Vet visits" },
    { id: "weigh_in", label: "Weigh-ins" },
  ];
  if (petType === "cat") {
    return [...shared, { id: "maintenance", label: "Maintenance" }];
  }
  return [
    ...shared,
    { id: "training", label: "Training" },
    { id: "potty", label: "Potty" },
  ];
}
