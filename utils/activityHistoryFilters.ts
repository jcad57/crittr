import type { ActivityFilterCategory } from "@/data/activityHistory";

export type ActivityFilterMenuItem = {
  id: ActivityFilterCategory;
  label: string;
};

export function activityFilterMenuItems(
  petType: string | null | undefined,
): ActivityFilterMenuItem[] {
  const shared: ActivityFilterMenuItem[] = [
    { id: "all", label: "All" },
    { id: "exercise", label: "Exercise" },
    { id: "meals", label: "Meals" },
    { id: "meds", label: "Meds" },
    { id: "vet_visit", label: "Vet visits" },
  ];
  if (petType === "cat") {
    return [...shared, { id: "maintenance", label: "Maintenance" }];
  }
  return [
    ...shared,
    { id: "treats", label: "Treats" },
    { id: "training", label: "Training" },
    { id: "potty", label: "Potty" },
  ];
}
