import type { ActivityType } from "@/types/database";

export function addActivityNavTitle(
  step: "type" | "details",
  activityType: ActivityType | null,
): string {
  if (step === "type") return "Log activity";
  switch (activityType) {
    case "exercise":
      return "Add exercise";
    case "food":
      return "Add meal";
    case "medication":
      return "Add medication";
    case "training":
      return "Add training";
    case "potty":
      return "Log potty";
    default:
      return "Log activity";
  }
}

export function manageActivityNavTitle(t: string | null | undefined): string {
  switch (t) {
    case "exercise":
      return "Edit exercise";
    case "food":
      return "Edit meal";
    case "medication":
      return "Edit medication";
    case "vet_visit":
      return "Edit vet visit";
    case "training":
      return "Edit training";
    case "potty":
      return "Edit potty";
    default:
      return "Edit activity";
  }
}
