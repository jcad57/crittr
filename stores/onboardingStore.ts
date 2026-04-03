import {
  EMPTY_PET_FORM,
  type AccountFormData,
  type PetFormData,
  type ProfileFormData,
} from "@/types/database";
import { create } from "zustand";

export const ONBOARDING_STEPS = [
  "signup",
  "verify-email",
  "profile",
  "pending-invites",
  "pet-type",
  "pet-details",
  "pet-food",
  "pet-vet-clinic",
  "pet-health-records",
  "pet-medications",
  "pet-vaccinations",
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

export const FINISH_STEP_INDEX = ONBOARDING_STEPS.indexOf("finish");

export const PROFILE_STEP_INDEX = ONBOARDING_STEPS.indexOf("profile");

/** Dot indicator is hidden on signup + verify-email; dots cover profile → finish. */
export const ONBOARDING_INDICATED_STEP_COUNT = ONBOARDING_STEPS.length - 2;

/** Index of the email OTP step (after signup). */
export const VERIFY_EMAIL_STEP_INDEX =
  ONBOARDING_STEPS.indexOf("verify-email");

type OnboardingState = {
  currentStep: number;
  /** When `add-pet`, only pet-type → finish steps are used; signup/profile are skipped. */
  petFlowMode: PetFlowMode;
  accountData: AccountFormData;
  profileData: ProfileFormData;
  pets: PetFormData[];
  currentPetIndex: number;
  /**
   * After we auto-advance past pending-invites with zero invites, Back from pet-type
   * should go to profile — not step 2 (which would auto-advance again).
   */
  skippedPendingInvitesEmpty: boolean;
  /**
   * True after "Add another pet" from finish — Back from pet-type returns to finish;
   * Cancel discards the new pet row and returns to finish.
   */
  addingAnotherPet: boolean;
  /**
   * True after sign-up when email confirmation is required (no session yet).
   * Lets auth layout allow onboarding without `?intent=signup` if the URL loses it.
   */
  emailVerificationPending: boolean;
  /**
   * Where “Back” from profile should go when the user already has a session:
   * `signup` = direct-to-profile (no OTP); `welcome` = after OTP (cannot return to OTP).
   * `null` = unknown (e.g. cold resume) → treat like welcome (sign out + welcome).
   */
  profileBackAfterProfile: "signup" | "welcome" | null;
  /**
   * When true, `(auth)/_layout` skips its guest-onboarding → welcome `<Redirect>` so
   * imperative `router.replace("/(auth)/welcome")` is the only navigation (avoids double stack).
   */
  skipOnboardingGuestRedirect: boolean;

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
  setSkippedPendingInvitesEmpty: (value: boolean) => void;
  /** Abandon the in-progress extra pet and return to the finish step. */
  cancelAddAnotherPet: () => void;
  setEmailVerificationPending: (value: boolean) => void;
  setProfileBackAfterProfile: (value: "signup" | "welcome" | null) => void;
  setSkipOnboardingGuestRedirect: (value: boolean) => void;
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
  skippedPendingInvitesEmpty: false,
  addingAnotherPet: false,
  emailVerificationPending: false,
  profileBackAfterProfile: null,
  skipOnboardingGuestRedirect: false,

  nextStep: () => set((s) => ({ currentStep: s.currentStep + 1 })),

  setSkippedPendingInvitesEmpty: (value) =>
    set({ skippedPendingInvitesEmpty: value }),

  prevStep: () =>
    set((s) => ({ currentStep: Math.max(0, s.currentStep - 1) })),

  goToStep: (step) => set({ currentStep: step }),

  startAddPetFlow: () =>
    set({
      petFlowMode: "add-pet",
      currentStep: PET_TYPE_STEP_INDEX,
      pets: [{ ...EMPTY_PET_FORM }],
      currentPetIndex: 0,
      skippedPendingInvitesEmpty: false,
      addingAnotherPet: false,
      emailVerificationPending: false,
      profileBackAfterProfile: null,
      skipOnboardingGuestRedirect: false,
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
        skippedPendingInvitesEmpty: false,
        addingAnotherPet: true,
      };
    }),

  setEmailVerificationPending: (value) =>
    set({ emailVerificationPending: value }),

  setProfileBackAfterProfile: (value) =>
    set({ profileBackAfterProfile: value }),

  setSkipOnboardingGuestRedirect: (value) =>
    set({ skipOnboardingGuestRedirect: value }),

  cancelAddAnotherPet: () => {
    const s = get();
    if (!s.addingAnotherPet || s.pets.length <= 1) return;
    const pets = s.pets.slice(0, -1);
    set({
      pets,
      currentPetIndex: pets.length - 1,
      currentStep: FINISH_STEP_INDEX,
      addingAnotherPet: false,
    });
  },

  editPetAtIndex: (index) => {
    const s = get();
    if (index < 0 || index >= s.pets.length) return;
    set({
      currentPetIndex: index,
      currentStep: ONBOARDING_STEPS.indexOf("pet-type"),
      skippedPendingInvitesEmpty: false,
      addingAnotherPet: false,
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
      skippedPendingInvitesEmpty: false,
      addingAnotherPet: false,
      emailVerificationPending: false,
      profileBackAfterProfile: null,
      skipOnboardingGuestRedirect: false,
    }),
}));
