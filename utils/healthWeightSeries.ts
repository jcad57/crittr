import type { Pet, PetWeightEntry } from "@/types/database";
import type { UserDateDisplay } from "@/utils/userDateTimeFormat";
import { dateLocaleFor } from "@/utils/userDateTimeFormat";

export type WeightBarPoint = { label: string; value: number };

function shortLabel(iso: string, dateDisplay: UserDateDisplay): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(dateLocaleFor(dateDisplay), {
    month: "short",
    day: "numeric",
  });
}

export function buildWeightSeriesForPet(
  pet: Pet,
  entries: PetWeightEntry[],
  dateDisplay: UserDateDisplay = "mdy",
): { points: WeightBarPoint[]; unitLabel: string } {
  const mine = entries
    .filter((e) => e.pet_id === pet.id)
    .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
    .slice(-8);

  if (mine.length > 0) {
    return {
      points: mine.map((e) => ({
        label: shortLabel(e.recorded_at, dateDisplay),
        value: Number(e.weight_lbs),
      })),
      unitLabel: mine[0].weight_unit === "kg" ? "kilograms" : "pounds",
    };
  }

  if (pet.weight_lbs != null) {
    return {
      points: [
        {
          label: "Profile",
          value: Number(pet.weight_lbs),
        },
      ],
      unitLabel: pet.weight_unit === "kg" ? "kilograms" : "pounds",
    };
  }

  return { points: [], unitLabel: "pounds" };
}
