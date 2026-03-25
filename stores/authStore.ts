import { supabase } from "@/lib/supabase";
import { ONBOARDING_STEPS } from "@/stores/onboardingStore";
import type { Profile } from "@/types/database";
import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";

const PROFILE_STEP = ONBOARDING_STEPS.indexOf("profile");
const PET_TYPE_STEP = ONBOARDING_STEPS.indexOf("pet-type");

function hasDisplayNameAndBio(profile: Profile | null): boolean {
  if (!profile) return false;
  const nameOk = Boolean(profile.display_name?.trim());
  const bioOk = Boolean(profile.bio?.trim());
  return nameOk && bioOk;
}

export type ResolvedOnboarding = {
  profile: Profile | null;
  needsOnboarding: boolean;
  hasPets: boolean;
  /** Step index in `ONBOARDING_STEPS` when `needsOnboarding` is true; otherwise `null`. */
  onboardingResumeStep: number | null;
};

/**
 * One round-trip: profile row + pet count (parallel). Derives onboarding progress.
 */
async function resolveSession(session: Session): Promise<ResolvedOnboarding> {
  const userId = session.user.id;

  const [profileRes, petsCountRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("pets")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", userId),
  ]);

  let profile = profileRes.data ?? null;
  const petError = petsCountRes.error;
  const count = petError ? 0 : petsCountRes.count ?? 0;
  const hasPets = count > 0;

  if (profile?.onboarding_complete && hasDisplayNameAndBio(profile) && hasPets) {
    return {
      profile,
      needsOnboarding: false,
      hasPets,
      onboardingResumeStep: null,
    };
  }

  const profileComplete = hasDisplayNameAndBio(profile);

  if (profileComplete && hasPets) {
    if (profile && !profile.onboarding_complete) {
      const { data: updated } = await supabase
        .from("profiles")
        .update({ onboarding_complete: true })
        .eq("id", userId)
        .select()
        .single();
      profile = updated ?? profile;
    }
    return {
      profile,
      needsOnboarding: false,
      hasPets,
      onboardingResumeStep: null,
    };
  }

  if (!profileComplete) {
    return {
      profile,
      needsOnboarding: true,
      hasPets,
      onboardingResumeStep: PROFILE_STEP,
    };
  }

  return {
    profile,
    needsOnboarding: true,
    hasPets,
    onboardingResumeStep: PET_TYPE_STEP,
  };
}

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  /** Cached from last resolve; used when updating profile without re-fetching pets. */
  hasPets: boolean;
  /** Target step index in `ONBOARDING_STEPS` when user must resume onboarding. */
  onboardingResumeStep: number | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  needsOnboarding: boolean;

  initialize: () => Promise<void>;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setProfile: (profile: Profile) => void;
  completeOnboarding: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  hasPets: false,
  onboardingResumeStep: null,
  isLoading: true,
  isLoggedIn: false,
  needsOnboarding: false,

  initialize: async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        const resolved = await resolveSession(session);
        set({
          session,
          profile: resolved.profile,
          hasPets: resolved.hasPets,
          onboardingResumeStep: resolved.onboardingResumeStep,
          isLoggedIn: true,
          needsOnboarding: resolved.needsOnboarding,
        });
      }

      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session) {
          const resolved = await resolveSession(session);
          set({
            session,
            profile: resolved.profile,
            hasPets: resolved.hasPets,
            onboardingResumeStep: resolved.onboardingResumeStep,
            isLoggedIn: true,
            needsOnboarding: resolved.needsOnboarding,
          });
        } else {
          set({
            session: null,
            profile: null,
            hasPets: false,
            onboardingResumeStep: null,
            isLoggedIn: false,
            needsOnboarding: false,
          });
        }
      });
    } catch (error) {
      console.error("Auth initialization failed:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  signUp: async (email, password, firstName, lastName) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName },
      },
    });
    if (error) throw error;
  },

  signInWithEmail: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      const resolved = await resolveSession(session);
      set({
        session,
        profile: resolved.profile,
        hasPets: resolved.hasPets,
        onboardingResumeStep: resolved.onboardingResumeStep,
        isLoggedIn: true,
        needsOnboarding: resolved.needsOnboarding,
      });
    }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    set({
      session: null,
      profile: null,
      hasPets: false,
      onboardingResumeStep: null,
      isLoggedIn: false,
      needsOnboarding: false,
    });
  },

  setProfile: (profile) => {
    set((s) => {
      if (profile.onboarding_complete) {
        return {
          profile,
          needsOnboarding: false,
          onboardingResumeStep: null,
        };
      }
      const profileComplete = hasDisplayNameAndBio(profile);
      const done = profileComplete && s.hasPets;
      return {
        profile,
        needsOnboarding: !done,
        onboardingResumeStep: done
          ? null
          : !profileComplete
            ? PROFILE_STEP
            : PET_TYPE_STEP,
      };
    });
  },

  completeOnboarding: async () => {
    const { session } = get();
    if (!session) throw new Error("No session");

    const { data, error } = await supabase
      .from("profiles")
      .update({ onboarding_complete: true })
      .eq("id", session.user.id)
      .select()
      .single();

    if (error) throw error;
    set({
      profile: data,
      needsOnboarding: false,
      hasPets: true,
      onboardingResumeStep: null,
    });
  },
}));
