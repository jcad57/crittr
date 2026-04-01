import type { FoodActivityExtraPetRow } from "@/lib/foodActivityMerge";
import {
  petActivityToExerciseForm,
  petActivityToFoodForm,
  petActivityToMedicationForm,
  petActivityToVetVisitForm,
} from "@/lib/hydrateActivityForm";
import type {
  ActivityType,
  ExerciseFormData,
  FoodActivityFormData,
  MedicationActivityFormData,
  PetActivity,
  VetVisitActivityFormData,
} from "@/types/database";
import { create } from "zustand";

type ActivityFormState = {
  step: "type" | "details";
  activityType: ActivityType | null;

  exerciseForm: ExerciseFormData;
  foodForm: FoodActivityFormData;
  /** Additional pets for the same meal/treat (shared label, type, notes; per-pet food + amount). */
  foodExtraRows: FoodActivityExtraPetRow[];
  /** Extra pets to log the same exercise for (shared details). */
  exerciseExtraPetIds: string[];
  /** Extra pets to log the same medication dose for (shared med + amount). */
  medicationExtraPetIds: string[];
  medicationForm: MedicationActivityFormData;
  vetVisitForm: VetVisitActivityFormData;

  /**
   * When null, save uses the current time at submit. When set, that instant is
   * stored as `logged_at` (after merging date with today in local time).
   */
  activityOccurredAt: Date | null;
  setActivityOccurredAt: (d: Date | null) => void;

  setStep: (step: "type" | "details") => void;
  selectType: (type: ActivityType) => void;
  updateExercise: (patch: Partial<ExerciseFormData>) => void;
  updateFood: (patch: Partial<FoodActivityFormData>) => void;
  addFoodExtraRow: (petId: string) => void;
  removeFoodExtraRow: (index: number) => void;
  updateFoodExtraRow: (
    index: number,
    patch: Partial<FoodActivityExtraPetRow>,
  ) => void;
  clearFoodExtraRows: () => void;
  addExerciseExtraPetId: (petId: string) => void;
  removeExerciseExtraPetId: (petId: string) => void;
  clearExerciseExtraPetIds: () => void;
  addMedicationExtraPetId: (petId: string) => void;
  removeMedicationExtraPetId: (petId: string) => void;
  clearMedicationExtraPetIds: () => void;
  updateMedication: (patch: Partial<MedicationActivityFormData>) => void;
  updateVetVisit: (patch: Partial<VetVisitActivityFormData>) => void;
  reset: () => void;
  hydrateFromActivity: (
    activity: PetActivity,
    options?: { vetClinic?: string | null },
  ) => void;
};

const EMPTY_EXERCISE: ExerciseFormData = {
  label: "",
  exerciseType: "",
  customExerciseType: "",
  durationHours: "",
  durationMinutes: "",
  distanceMiles: "",
  location: "",
  notes: "",
};

const EMPTY_FOOD: FoodActivityFormData = {
  label: "",
  isTreat: false,
  foodId: "",
  foodBrand: "",
  amount: "",
  unit: "Cups",
  notes: "",
};

const EMPTY_MED: MedicationActivityFormData = {
  medicationId: "",
  medicationName: "",
  amount: "",
  unit: "",
  notes: "",
};

const EMPTY_VET: VetVisitActivityFormData = {
  label: "",
  vetLocation: "",
  customVetLocation: "",
  otherPetIds: [],
  notes: "",
};

export const useActivityFormStore = create<ActivityFormState>((set) => ({
  step: "type",
  activityType: null,
  exerciseForm: { ...EMPTY_EXERCISE },
  foodForm: { ...EMPTY_FOOD },
  foodExtraRows: [],
  exerciseExtraPetIds: [],
  medicationExtraPetIds: [],
  medicationForm: { ...EMPTY_MED },
  vetVisitForm: { ...EMPTY_VET },
  activityOccurredAt: null,

  setStep: (step) => set({ step }),
  selectType: (type) => set({ activityType: type }),
  setActivityOccurredAt: (d) => set({ activityOccurredAt: d }),

  updateExercise: (patch) =>
    set((s) => ({ exerciseForm: { ...s.exerciseForm, ...patch } })),
  updateFood: (patch) =>
    set((s) => ({ foodForm: { ...s.foodForm, ...patch } })),
  addFoodExtraRow: (petId) =>
    set((s) => ({
      foodExtraRows: [
        ...s.foodExtraRows,
        {
          petId,
          foodId: "",
          foodBrand: "",
          amount: "",
          unit: "Cups",
        },
      ],
    })),
  removeFoodExtraRow: (index) =>
    set((s) => ({
      foodExtraRows: s.foodExtraRows.filter((_, i) => i !== index),
    })),
  updateFoodExtraRow: (index, patch) =>
    set((s) => ({
      foodExtraRows: s.foodExtraRows.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    })),
  clearFoodExtraRows: () => set({ foodExtraRows: [] }),
  addExerciseExtraPetId: (petId) =>
    set((s) => ({
      exerciseExtraPetIds: s.exerciseExtraPetIds.includes(petId)
        ? s.exerciseExtraPetIds
        : [...s.exerciseExtraPetIds, petId],
    })),
  removeExerciseExtraPetId: (petId) =>
    set((s) => ({
      exerciseExtraPetIds: s.exerciseExtraPetIds.filter((id) => id !== petId),
    })),
  clearExerciseExtraPetIds: () => set({ exerciseExtraPetIds: [] }),
  addMedicationExtraPetId: (petId) =>
    set((s) => ({
      medicationExtraPetIds: s.medicationExtraPetIds.includes(petId)
        ? s.medicationExtraPetIds
        : [...s.medicationExtraPetIds, petId],
    })),
  removeMedicationExtraPetId: (petId) =>
    set((s) => ({
      medicationExtraPetIds: s.medicationExtraPetIds.filter((id) => id !== petId),
    })),
  clearMedicationExtraPetIds: () => set({ medicationExtraPetIds: [] }),
  updateMedication: (patch) =>
    set((s) => ({ medicationForm: { ...s.medicationForm, ...patch } })),
  updateVetVisit: (patch) =>
    set((s) => ({ vetVisitForm: { ...s.vetVisitForm, ...patch } })),

  reset: () =>
    set({
      step: "type",
      activityType: null,
      exerciseForm: { ...EMPTY_EXERCISE },
      foodForm: { ...EMPTY_FOOD },
      foodExtraRows: [],
      exerciseExtraPetIds: [],
      medicationExtraPetIds: [],
      medicationForm: { ...EMPTY_MED },
      vetVisitForm: { ...EMPTY_VET },
      activityOccurredAt: null,
    }),

  hydrateFromActivity: (activity, options) => {
    const vetClinic = options?.vetClinic;
    const type = activity.activity_type;
    set({
      step: "details",
      activityType: type,
      exerciseForm:
        type === "exercise"
          ? petActivityToExerciseForm(activity)
          : { ...EMPTY_EXERCISE },
      foodForm:
        type === "food" ? petActivityToFoodForm(activity) : { ...EMPTY_FOOD },
      foodExtraRows: [],
      exerciseExtraPetIds: [],
      medicationExtraPetIds: [],
      medicationForm:
        type === "medication"
          ? petActivityToMedicationForm(activity)
          : { ...EMPTY_MED },
      vetVisitForm:
        type === "vet_visit"
          ? petActivityToVetVisitForm(activity, vetClinic)
          : { ...EMPTY_VET },
      activityOccurredAt: new Date(activity.logged_at),
    });
  },
}));
