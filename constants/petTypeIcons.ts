import type { PetType } from "@/types/database";
import type { MaterialCommunityIcons } from "@expo/vector-icons";

/** Material icon names — full catalog (dashboard, profiles, etc. still show all types). */
export const PET_TYPE_ICON_MAP: Record<
  PetType,
  keyof typeof MaterialCommunityIcons.glyphMap
> = {
  dog: "dog",
  cat: "cat",
  fish: "fish",
  bird: "bird",
  reptile: "snake",
  small_mammal: "paw",
};

export function petTypeMaterialIcon(
  petType: PetType | null | undefined,
): keyof typeof MaterialCommunityIcons.glyphMap {
  if (petType && petType in PET_TYPE_ICON_MAP) {
    return PET_TYPE_ICON_MAP[petType];
  }
  return "paw";
}

/** Full list — keep in sync with `PetType` and DB reference data. */
export const PET_TYPE_OPTIONS: readonly { id: PetType; label: string }[] = [
  { id: "dog", label: "Dog" },
  { id: "cat", label: "Cat" },
  { id: "fish", label: "Fish" },
  { id: "bird", label: "Bird" },
  { id: "reptile", label: "Reptile" },
  { id: "small_mammal", label: "Small Mammal" },
] as const;

/** Types users can choose in onboarding / add-pet (test build). Revisit when expanding species. */
const SELECTABLE_PET_TYPE_IDS = new Set<PetType>(["dog", "cat"]);

/**
 * Options for the pet-type grid (`PetTypeStep`). New pets: dog and cat only.
 * If `currentPetType` is a legacy non–dog/cat value, it is appended so edit flows still match selection.
 */
export function getPetTypeOptionsForPicker(
  currentPetType: PetType | "",
): readonly { id: PetType; label: string }[] {
  const selectable = PET_TYPE_OPTIONS.filter((o) =>
    SELECTABLE_PET_TYPE_IDS.has(o.id),
  );
  if (!currentPetType || SELECTABLE_PET_TYPE_IDS.has(currentPetType)) {
    return selectable;
  }
  const current = PET_TYPE_OPTIONS.find((o) => o.id === currentPetType);
  return current ? [...selectable, current] : selectable;
}
