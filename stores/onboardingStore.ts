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
  "pet-type",
  "pet-info",
  "pet-care",
  "finish",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

type OnboardingState = {
  currentStep: number;
  accountData: AccountFormData;
  profileData: ProfileFormData;
  pets: PetFormData[];
  currentPetIndex: number;

  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  setAccountData: (data: Partial<AccountFormData>) => void;
  setProfileData: (data: Partial<ProfileFormData>) => void;
  updateCurrentPet: (data: Partial<PetFormData>) => void;
  finishCurrentPet: () => void;
  addAnotherPet: () => void;
  reset: () => void;
};

const INITIAL_ACCOUNT: AccountFormData = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
};

const INITIAL_PROFILE: ProfileFormData = {
  displayName: "",
  bio: "",
  avatarUri: null,
};

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  currentStep: 0,
  accountData: { ...INITIAL_ACCOUNT },
  profileData: { ...INITIAL_PROFILE },
  pets: [{ ...EMPTY_PET_FORM }],
  currentPetIndex: 0,

  nextStep: () => set((s) => ({ currentStep: s.currentStep + 1 })),
  prevStep: () => set((s) => ({ currentStep: Math.max(0, s.currentStep - 1) })),
  goToStep: (step) => set({ currentStep: step }),

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

  reset: () =>
    set({
      currentStep: 0,
      accountData: { ...INITIAL_ACCOUNT },
      profileData: { ...INITIAL_PROFILE },
      pets: [{ ...EMPTY_PET_FORM }],
      currentPetIndex: 0,
    }),
}));
