import {
  EMPTY_PET_FORM,
  type AccountFormData,
  type PetFormData,
  type ProfileFormData,
} from "@/types/database";
import { create } from "zustand";

export const ONBOARDING_STEPS = [
  "signup",
  "profile",
  "pending-invites",
  "pet-type",
  "pet-info",
  "pet-care",
  "finish",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** `onboarding` = full signup flow; `add-pet` = logged-in user adding a pet (reuses pet steps). */
export type PetFlowMode = "onboarding" | "add-pet";

/** Index of `"pending-invites"` in `ONBOARDING_STEPS`. */
export const PENDING_INVITES_STEP_INDEX =
  ONBOARDING_STEPS.indexOf("pending-invites");

/** Index of `"pet-type"` in `ONBOARDING_STEPS` (shared by add-pet flow). */
export const PET_TYPE_STEP_INDEX = ONBOARDING_STEPS.indexOf("pet-type");

type OnboardingState = {
  currentStep: number;
  /** When `add-pet`, only pet-type → finish steps are used; signup/profile are skipped. */
  petFlowMode: PetFlowMode;
  accountData: AccountFormData;
  profileData: ProfileFormData;
  pets: PetFormData[];
  currentPetIndex: number;

  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  /** Begin add-pet flow: fresh pet form, jump to pet type step. */
  startAddPetFlow: () => void;
  setAccountData: (data: Partial<AccountFormData>) => void;
  setProfileData: (data: Partial<ProfileFormData>) => void;
  updateCurrentPet: (data: Partial<PetFormData>) => void;
  finishCurrentPet: () => void;
  addAnotherPet: () => void;
  /** Jump to pet-type step for an existing pet (data stays in `pets[index]`). */
  editPetAtIndex: (index: number) => void;
  reset: () => void;
};

const INITIAL_ACCOUNT: AccountFormData = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
};

const INITIAL_PROFILE: ProfileFormData = {
  bio: "",
  homeAddress: "",
  phoneNumber: "",
  avatarUri: null,
};

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  currentStep: 0,
  petFlowMode: "onboarding",
  accountData: { ...INITIAL_ACCOUNT },
  profileData: { ...INITIAL_PROFILE },
  pets: [{ ...EMPTY_PET_FORM }],
  currentPetIndex: 0,

  nextStep: () => set((s) => ({ currentStep: s.currentStep + 1 })),
  prevStep: () => set((s) => ({ currentStep: Math.max(0, s.currentStep - 1) })),
  goToStep: (step) => set({ currentStep: step }),

  startAddPetFlow: () =>
    set({
      petFlowMode: "add-pet",
      currentStep: PET_TYPE_STEP_INDEX,
      pets: [{ ...EMPTY_PET_FORM }],
      currentPetIndex: 0,
    }),

  setAccountData: (data) =>
    set((s) => ({ accountData: { ...s.accountData, ...data } })),

  setProfileData: (data) =>
    set((s) => ({ profileData: { ...s.profileData, ...data } })),

  updateCurrentPet: (data) =>
    set((s) => {
      const pets = [...s.pets];
      pets[s.currentPetIndex] = { ...pets[s.currentPetIndex], ...data };
      return { pets };
    }),

  finishCurrentPet: () => {},

  addAnotherPet: () =>
    set((s) => {
      const pets = [...s.pets, { ...EMPTY_PET_FORM }];
      return {
        pets,
        currentPetIndex: pets.length - 1,
        currentStep: ONBOARDING_STEPS.indexOf("pet-type"),
      };
    }),

  editPetAtIndex: (index) => {
    const s = get();
    if (index < 0 || index >= s.pets.length) return;
    set({
      currentPetIndex: index,
      currentStep: ONBOARDING_STEPS.indexOf("pet-type"),
    });
  },

  reset: () =>
    set({
      currentStep: 0,
      petFlowMode: "onboarding",
      accountData: { ...INITIAL_ACCOUNT },
      profileData: { ...INITIAL_PROFILE },
      pets: [{ ...EMPTY_PET_FORM }],
      currentPetIndex: 0,
    }),
}));
