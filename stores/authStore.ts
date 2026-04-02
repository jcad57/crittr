import { profileQueryKey } from "@/hooks/queries/queryKeys";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { ONBOARDING_STEPS } from "@/stores/onboardingStore";
import type { Profile } from "@/types/database";
import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";

const PROFILE_STEP = ONBOARDING_STEPS.indexOf("profile");
const PENDING_INVITES_STEP = ONBOARDING_STEPS.indexOf("pending-invites");
const PET_TYPE_STEP = ONBOARDING_STEPS.indexOf("pet-type");

/** Profile onboarding step: home address and phone required; bio is optional. */
function isProfileStepComplete(profile: Profile | null): boolean {
  if (!profile) return false;
  return (
    Boolean(profile.home_address?.trim()) &&
    Boolean(profile.phone_number?.trim())
  );
}

export type ResolvedOnboarding = {
  profile: Profile | null;
  needsOnboarding: boolean;
  hasPets: boolean;
  /** Step index in `ONBOARDING_STEPS` when `needsOnboarding` is true; otherwise `null`. */
  onboardingResumeStep: number | null;
  ownedPetCount: number;
  coCarePetCount: number;
  /** Unread “removed as co-carer” notifications (cold start after removal when app was closed). */
  unreadCoCareRemovalCount: number;
};

/**
 * One round-trip: profile row + pet counts (owned + co-cared) + pending invites (parallel).
 * Derives onboarding progress including co-care pets.
 */
async function resolveSession(session: Session): Promise<ResolvedOnboarding> {
  const userId = session.user.id;

  const [
    profileRes,
    ownedCountRes,
    coCareCountRes,
    pendingInvitesRes,
    removalNotifRes,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("pets")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", userId),
    supabase
      .from("pet_co_carers")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("co_carer_invites")
      .select("*", { count: "exact", head: true })
      .eq("invited_user_id", userId)
      .eq("status", "pending"),
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("type", "co_care_removed")
      .eq("read", false),
  ]);

  let profile = profileRes.data ?? null;
  const ownedCount = ownedCountRes.error ? 0 : ownedCountRes.count ?? 0;
  const coCareCount = coCareCountRes.error ? 0 : coCareCountRes.count ?? 0;
  const unreadCoCareRemovalCount = removalNotifRes.error
    ? 0
    : removalNotifRes.count ?? 0;
  const hasPets = ownedCount + coCareCount > 0;
  const pendingInviteCount = pendingInvitesRes.error
    ? 0
    : pendingInvitesRes.count ?? 0;

  if (
    profile?.onboarding_complete &&
    isProfileStepComplete(profile) &&
    hasPets
  ) {
    return {
      profile,
      needsOnboarding: false,
      hasPets,
      onboardingResumeStep: null,
      ownedPetCount: ownedCount,
      coCarePetCount: coCareCount,
      unreadCoCareRemovalCount,
    };
  }

  const profileComplete = isProfileStepComplete(profile);

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
      ownedPetCount: ownedCount,
      coCarePetCount: coCareCount,
      unreadCoCareRemovalCount,
    };
  }

  if (!profileComplete) {
    return {
      profile,
      needsOnboarding: true,
      hasPets,
      onboardingResumeStep: PROFILE_STEP,
      ownedPetCount: ownedCount,
      coCarePetCount: coCareCount,
      unreadCoCareRemovalCount,
    };
  }

  if (pendingInviteCount > 0) {
    return {
      profile,
      needsOnboarding: true,
      hasPets,
      onboardingResumeStep: PENDING_INVITES_STEP,
      ownedPetCount: ownedCount,
      coCarePetCount: coCareCount,
      unreadCoCareRemovalCount,
    };
  }

  return {
    profile,
    needsOnboarding: true,
    hasPets,
    onboardingResumeStep: PET_TYPE_STEP,
    ownedPetCount: ownedCount,
    coCarePetCount: coCareCount,
    unreadCoCareRemovalCount,
  };
}

function syncProfileRowToQuery(profile: Profile | null) {
  if (!profile) return;
  queryClient.setQueryData(profileQueryKey(profile.id), profile);
}

/**
 * Co-carer-only users who lose their last co-care link need a dedicated screen
 * before generic onboarding (add a pet they own).
 */
function nextRequiresCoCareRemovedScreen(
  prev: {
    hasPets: boolean;
    ownedPetCount: number;
    coCarePetCount: number;
    requiresCoCareRemovedScreen: boolean;
  },
  resolved: ResolvedOnboarding,
): boolean {
  const profileComplete = isProfileStepComplete(resolved.profile);

  const lostAllCoCareOnly =
    prev.hasPets &&
    !resolved.hasPets &&
    resolved.ownedPetCount === 0 &&
    prev.coCarePetCount > 0 &&
    resolved.coCarePetCount === 0;

  const coldStartFromRemovalNotification =
    !resolved.hasPets &&
    resolved.ownedPetCount === 0 &&
    resolved.coCarePetCount === 0 &&
    profileComplete &&
    resolved.unreadCoCareRemovalCount > 0;

  if (lostAllCoCareOnly || coldStartFromRemovalNotification) return true;
  if (resolved.hasPets) return false;
  return prev.requiresCoCareRemovedScreen;
}

/**
 * `getSession()` only reads the persisted JWT. After a user is removed in Supabase,
 * that token can still be present until expiry, which incorrectly routes to onboarding.
 * `getUser()` validates with the Auth server; 401/403 means the session is invalid.
 */
async function isAuthUserStillRegistered(): Promise<boolean> {
  const { data, error } = await supabase.auth.getUser();
  const status = (error as { status?: number })?.status;

  if (error && (status === 401 || status === 403 || status === 404)) {
    return false;
  }
  if (!error && data && !data.user) {
    return false;
  }
  // Network / transient errors: keep local session so offline use still works.
  return true;
}

const loggedOutState = {
  session: null,
  profile: null,
  hasPets: false,
  ownedPetCount: 0,
  coCarePetCount: 0,
  requiresCoCareRemovedScreen: false,
  onboardingResumeStep: null,
  isLoggedIn: false,
  needsOnboarding: false,
} as const;

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  /** Cached from last resolve; used when updating profile without re-fetching pets. */
  hasPets: boolean;
  ownedPetCount: number;
  coCarePetCount: number;
  /**
   * When true, user only had co-care pets and lost all access; show removal screen
   * before add-pet onboarding.
   */
  requiresCoCareRemovedScreen: boolean;
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
  /** Re-runs server onboarding/pet checks (owned + co-care). Call after co-care changes or profile save. */
  refreshAuthSession: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  hasPets: false,
  ownedPetCount: 0,
  coCarePetCount: 0,
  requiresCoCareRemovedScreen: false,
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
        const stillRegistered = await isAuthUserStillRegistered();
        if (!stillRegistered) {
          await supabase.auth.signOut();
          queryClient.clear();
          set(loggedOutState);
        } else {
          const resolved = await resolveSession(session);
          const prev = get();
          const requiresCoCareRemovedScreen = nextRequiresCoCareRemovedScreen(
            {
              hasPets: prev.hasPets,
              ownedPetCount: prev.ownedPetCount,
              coCarePetCount: prev.coCarePetCount,
              requiresCoCareRemovedScreen: prev.requiresCoCareRemovedScreen,
            },
            resolved,
          );
          set({
            session,
            profile: resolved.profile,
            hasPets: resolved.hasPets,
            ownedPetCount: resolved.ownedPetCount,
            coCarePetCount: resolved.coCarePetCount,
            onboardingResumeStep: resolved.onboardingResumeStep,
            isLoggedIn: true,
            needsOnboarding: resolved.needsOnboarding,
            requiresCoCareRemovedScreen,
          });
          syncProfileRowToQuery(resolved.profile);
        }
      }

      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session) {
          const stillRegistered = await isAuthUserStillRegistered();
          if (!stillRegistered) {
            await supabase.auth.signOut();
            queryClient.clear();
            set(loggedOutState);
            return;
          }
          const resolved = await resolveSession(session);
          const prev = get();
          const requiresCoCareRemovedScreen = nextRequiresCoCareRemovedScreen(
            {
              hasPets: prev.hasPets,
              ownedPetCount: prev.ownedPetCount,
              coCarePetCount: prev.coCarePetCount,
              requiresCoCareRemovedScreen: prev.requiresCoCareRemovedScreen,
            },
            resolved,
          );
          set({
            session,
            profile: resolved.profile,
            hasPets: resolved.hasPets,
            ownedPetCount: resolved.ownedPetCount,
            coCarePetCount: resolved.coCarePetCount,
            onboardingResumeStep: resolved.onboardingResumeStep,
            isLoggedIn: true,
            needsOnboarding: resolved.needsOnboarding,
            requiresCoCareRemovedScreen,
          });
          syncProfileRowToQuery(resolved.profile);
        } else {
          queryClient.clear();
          set({
            session: null,
            profile: null,
            hasPets: false,
            ownedPetCount: 0,
            coCarePetCount: 0,
            requiresCoCareRemovedScreen: false,
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
      const prev = get();
      const requiresCoCareRemovedScreen = nextRequiresCoCareRemovedScreen(
        {
          hasPets: prev.hasPets,
          ownedPetCount: prev.ownedPetCount,
          coCarePetCount: prev.coCarePetCount,
          requiresCoCareRemovedScreen: prev.requiresCoCareRemovedScreen,
        },
        resolved,
      );
      set({
        session,
        profile: resolved.profile,
        hasPets: resolved.hasPets,
        ownedPetCount: resolved.ownedPetCount,
        coCarePetCount: resolved.coCarePetCount,
        onboardingResumeStep: resolved.onboardingResumeStep,
        isLoggedIn: true,
        needsOnboarding: resolved.needsOnboarding,
        requiresCoCareRemovedScreen,
      });
      syncProfileRowToQuery(resolved.profile);
    }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    queryClient.clear();
    set({
      session: null,
      profile: null,
      hasPets: false,
      ownedPetCount: 0,
      coCarePetCount: 0,
      requiresCoCareRemovedScreen: false,
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
      const profileComplete = isProfileStepComplete(profile);
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
    queryClient.setQueryData(profileQueryKey(profile.id), profile);
    void get().refreshAuthSession();
  },

  refreshAuthSession: async () => {
    const session = get().session;
    if (!session) return;
    const prev = get();
    const resolved = await resolveSession(session);
    const requiresCoCareRemovedScreen = nextRequiresCoCareRemovedScreen(
      {
        hasPets: prev.hasPets,
        ownedPetCount: prev.ownedPetCount,
        coCarePetCount: prev.coCarePetCount,
        requiresCoCareRemovedScreen: prev.requiresCoCareRemovedScreen,
      },
      resolved,
    );
    set({
      profile: resolved.profile,
      hasPets: resolved.hasPets,
      ownedPetCount: resolved.ownedPetCount,
      coCarePetCount: resolved.coCarePetCount,
      onboardingResumeStep: resolved.onboardingResumeStep,
      needsOnboarding: resolved.needsOnboarding,
      requiresCoCareRemovedScreen,
    });
    syncProfileRowToQuery(resolved.profile);
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
    if (data) {
      queryClient.setQueryData(profileQueryKey(data.id), data);
    }
    await get().refreshAuthSession();
  },
}));
