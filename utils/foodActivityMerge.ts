import type { FoodActivityFormData } from "@/types/database";

/** Per-pet food fields + pet id for batch meal logging. */
export type FoodActivityExtraPetRow = {
  petId: string;
} & Pick<
  FoodActivityFormData,
  "foodId" | "foodBrand" | "amount" | "unit"
>;

/** Same label, notes, meal/treat type; per-pet food + amount. */
export function foodActivityFormForPet(
  base: FoodActivityFormData,
  petFields: Pick<
    FoodActivityFormData,
    "foodId" | "foodBrand" | "amount" | "unit"
  >,
): FoodActivityFormData {
  return {
    ...base,
    ...petFields,
  };
}
