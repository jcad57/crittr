import type { MealPortionDraft } from "@/utils/petFood";
import type { Dispatch, SetStateAction } from "react";

type PortionEditorHandlersOpts = {
  mealPortions: MealPortionDraft[];
  setMealPortions: Dispatch<SetStateAction<MealPortionDraft[]>>;
  editingPortionIndex: number | null;
  setEditingPortionIndex: (index: number | null) => void;
  setPortionEditorDraft: (draft: MealPortionDraft | null) => void;
  setPortionModalVisible: (visible: boolean) => void;
  setPortionModalTitle: (title: string) => void;
};

export type PortionEditorHandlers = {
  openAddPortion: () => void;
  openEditPortion: (index: number) => void;
  removePortion: (index: number) => void;
  savePortionFromModal: (draft: MealPortionDraft) => void;
};

/**
 * Factory that returns imperative handlers for the portion editor modal. Lives
 * outside the screen body to keep the pet-food screen render small; safe to
 * call each render since all state reads/writes go through the passed-in
 * setters.
 */
export function createPetFoodPortionHandlers({
  mealPortions,
  setMealPortions,
  editingPortionIndex,
  setEditingPortionIndex,
  setPortionEditorDraft,
  setPortionModalVisible,
  setPortionModalTitle,
}: PortionEditorHandlersOpts): PortionEditorHandlers {
  const openAddPortion = () => {
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    setPortionModalTitle("Add a portion");
    setEditingPortionIndex(null);
    setPortionEditorDraft({
      key: `new-${Date.now()}`,
      portionSize: "",
      portionUnit: "Cups",
      feedTime: d,
    });
    setPortionModalVisible(true);
  };

  const openEditPortion = (index: number) => {
    const row = mealPortions[index];
    if (!row) return;
    setPortionModalTitle("Edit portion");
    setEditingPortionIndex(index);
    setPortionEditorDraft({
      ...row,
      feedTime: new Date(row.feedTime.getTime()),
    });
    setPortionModalVisible(true);
  };

  const removePortion = (index: number) => {
    setMealPortions((rows) => rows.filter((_, i) => i !== index));
  };

  const savePortionFromModal = (draft: MealPortionDraft) => {
    if (editingPortionIndex !== null) {
      setMealPortions((rows) =>
        rows.map((r, i) => (i === editingPortionIndex ? draft : r)),
      );
    } else {
      setMealPortions((rows) => [...rows, draft]);
    }
    setPortionModalVisible(false);
    setEditingPortionIndex(null);
    setPortionEditorDraft(null);
  };

  return { openAddPortion, openEditPortion, removePortion, savePortionFromModal };
}
