import {
  DEFAULT_DOSAGE_TYPE,
  MAX_MEDICATION_DOSAGES,
} from "@/constants/medicationEditForm";
import type { MedicationDosageDraft } from "@/utils/medicationDosageDraft";
import type { Dispatch, SetStateAction } from "react";

type DosageEditorHandlersOpts = {
  dosages: MedicationDosageDraft[];
  setDosages: Dispatch<SetStateAction<MedicationDosageDraft[]>>;
  editingDosageIndex: number | null;
  setEditingDosageIndex: (index: number | null) => void;
  setDosageEditorDraft: (draft: MedicationDosageDraft | null) => void;
  setDosageModalVisible: (visible: boolean) => void;
  setDosageModalTitle: (title: string) => void;
};

export type DosageEditorHandlers = {
  openAddDosage: () => void;
  openEditDosage: (index: number) => void;
  removeDosage: (index: number) => void;
  saveDosageFromModal: (draft: MedicationDosageDraft) => void;
};

export function createMedicationDosageHandlers({
  dosages,
  setDosages,
  editingDosageIndex,
  setEditingDosageIndex,
  setDosageEditorDraft,
  setDosageModalVisible,
  setDosageModalTitle,
}: DosageEditorHandlersOpts): DosageEditorHandlers {
  const openAddDosage = () => {
    if (dosages.length >= MAX_MEDICATION_DOSAGES) return;
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    setDosageModalTitle("Add dosage");
    setEditingDosageIndex(null);
    setDosageEditorDraft({
      key: `new-${Date.now()}`,
      dosageAmount: "",
      dosageType: DEFAULT_DOSAGE_TYPE,
      reminderTime: d,
    });
    setDosageModalVisible(true);
  };

  const openEditDosage = (index: number) => {
    const row = dosages[index];
    if (!row) return;
    setDosageModalTitle("Edit dosage");
    setEditingDosageIndex(index);
    setDosageEditorDraft({
      ...row,
      reminderTime: new Date(row.reminderTime.getTime()),
    });
    setDosageModalVisible(true);
  };

  const removeDosage = (index: number) => {
    setDosages((rows) => rows.filter((_, i) => i !== index));
  };

  const saveDosageFromModal = (draft: MedicationDosageDraft) => {
    if (editingDosageIndex !== null) {
      setDosages((rows) =>
        rows.map((r, i) => (i === editingDosageIndex ? draft : r)),
      );
    } else {
      setDosages((rows) =>
        rows.length >= MAX_MEDICATION_DOSAGES ? rows : [...rows, draft],
      );
    }
    setDosageModalVisible(false);
    setEditingDosageIndex(null);
    setDosageEditorDraft(null);
  };

  return { openAddDosage, openEditDosage, removeDosage, saveDosageFromModal };
}
