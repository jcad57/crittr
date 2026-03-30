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
  medicationForm: MedicationActivityFormData;
  vetVisitForm: VetVisitActivityFormData;

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
  medicationForm: { ...EMPTY_MED },
  vetVisitForm: { ...EMPTY_VET },

  setStep: (step) => set({ step }),
  selectType: (type) => set({ activityType: type, step: "details" }),

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
      medicationForm: { ...EMPTY_MED },
      vetVisitForm: { ...EMPTY_VET },
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
      medicationForm:
        type === "medication"
          ? petActivityToMedicationForm(activity)
          : { ...EMPTY_MED },
      vetVisitForm:
        type === "vet_visit"
          ? petActivityToVetVisitForm(activity, vetClinic)
          : { ...EMPTY_VET },
    });
  },
}));
