import type { PetType } from "@/types/database";
import type { MaterialCommunityIcons } from "@expo/vector-icons";

/** Material icon names — matches the pet type grid when adding a pet (`PetTypeStep`). */
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

export const PET_TYPE_OPTIONS: readonly { id: PetType; label: string }[] = [
  { id: "dog", label: "Dog" },
  { id: "cat", label: "Cat" },
  { id: "fish", label: "Fish" },
  { id: "bird", label: "Bird" },
  { id: "reptile", label: "Reptile" },
  { id: "small_mammal", label: "Small Mammal" },
] as const;
