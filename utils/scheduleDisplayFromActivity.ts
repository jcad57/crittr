import type { PetActivity } from "@/types/database";
import { formatMedicationDosageDisplay } from "@/utils/medicationDosageDisplay";
import { pottyBreakSummary } from "@/data/activityHistory";

export type ScheduleDisplayFields = {
  label: string;
  detail_line: string | null;
  quantity_line: string | null;
  notes: string | null;
};

function quantityLine(amount: string | number | null | undefined, unit: string | null | undefined): string | null {
  const a =
    amount == null || amount === ""
      ? ""
      : typeof amount === "number"
        ? Number.isInteger(amount)
          ? String(amount)
          : String(Math.round(amount * 100) / 100)
        : String(amount).trim();
  const u = unit?.trim() ?? "";
  const line = [a, u].filter(Boolean).join(" ");
  return line || null;
}

function exerciseQuantity(a: PetActivity): string | null {
  const h = a.duration_hours ?? 0;
  const m = a.duration_minutes ?? 0;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m} min`);
  if (a.distance_miles != null && a.distance_miles > 0) {
    parts.push(`${a.distance_miles} mi`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * Map a logged `pet_activities` row into schedule card display fields.
 * Used after editing an activity so Schedule stays in sync with the dashboard.
 */
export function scheduleDisplayFieldsFromActivity(
  activity: PetActivity,
): ScheduleDisplayFields {
  const notes = activity.notes?.trim() || null;

  switch (activity.activity_type) {
    case "food": {
      const detail =
        activity.food_custom_name?.trim() ||
        null;
      return {
        label: activity.label.trim() || (activity.is_treat ? "Treat" : "Meal"),
        // Brand for profile foods isn't on the activity row — caller may
        // overlay `foodBrand` from the edit form via `withFoodBrand`.
        detail_line: detail,
        quantity_line: quantityLine(activity.food_amount, activity.food_unit),
        notes,
      };
    }
    case "medication": {
      const dose = formatMedicationDosageDisplay(
        activity.med_amount,
        activity.med_unit,
      );
      return {
        label: activity.label.trim() || "Medication",
        detail_line: dose || null,
        quantity_line: notes,
        notes: null,
      };
    }
    case "exercise":
      return {
        label: activity.label.trim() || "Exercise",
        detail_line: activity.location?.trim() || null,
        quantity_line: exerciseQuantity(activity),
        notes,
      };
    case "vet_visit":
      return {
        label: activity.label.trim() || "Vet visit",
        detail_line: activity.vet_location?.trim() || null,
        quantity_line: null,
        notes,
      };
    case "training": {
      const h = activity.duration_hours ?? 0;
      const m = activity.duration_minutes ?? 0;
      let qty: string | null = null;
      if (h > 0 && m > 0) qty = `${h}h ${m} min`;
      else if (h > 0) qty = `${h}h`;
      else if (m > 0) qty = `${m} min`;
      return {
        label: activity.label.trim() || "Training",
        detail_line: activity.location?.trim() || null,
        quantity_line: qty,
        notes,
      };
    }
    case "potty":
      return {
        label: activity.label.trim() || "Potty",
        detail_line: activity.location?.trim() || null,
        quantity_line: pottyBreakSummary(activity) || null,
        notes,
      };
    case "maintenance":
      return {
        label: activity.label.trim() || "Maintenance",
        detail_line: activity.location?.trim() || null,
        quantity_line: null,
        notes,
      };
    case "weigh_in": {
      const w = activity.weight_lbs;
      const u = activity.weight_unit;
      return {
        label: activity.label.trim() || "Weigh-in",
        detail_line: w != null && u ? `${w} ${u}` : null,
        quantity_line: null,
        notes,
      };
    }
    default:
      return {
        label: activity.label.trim() || "Activity",
        detail_line: null,
        quantity_line: null,
        notes,
      };
  }
}

/** Food edits include brand in the form even when `food_id` is set. */
export function withFoodBrand(
  fields: ScheduleDisplayFields,
  foodBrand: string | null | undefined,
): ScheduleDisplayFields {
  const brand = foodBrand?.trim();
  if (!brand) return fields;
  return { ...fields, detail_line: brand };
}
