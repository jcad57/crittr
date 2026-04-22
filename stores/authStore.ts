import { ensureCrittrProSyncedFromStripe } from "@/lib/crittrProEntitlementSync";
import { profileQueryKey } from "@/hooks/queries/queryKeys";
import {
  deriveProfileOnboardingState,
  nextRequiresCoCareRemovedScreen,
  resolveSession,
  type ResolvedOnboarding,
} from "@/lib/auth/resolveSession";
import { isAuthUserStillRegistered } from "@/lib/auth/sessionValidity";
import { queryClient } from "@/lib/queryClient";
import { supabase, wipeSupabaseAuthFromDevice } from "@/lib/supabase";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { usePetStore } from "@/stores/petStore";
import type { Profile } from "@/types/database";
import { withTimeout } from "@/utils/async";
import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";

export type { ResolvedOnboarding };

const AUTH_EMAIL_ACTION_TIMEOUT_MS = 45_000;

function syncProfileRowToQuery(profile: Profile | null) {
  if (!profile) return;
  queryClient.setQueryData(profileQueryKey(profile.id), profile);
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

let authListenerUnsub: (() => void) | null = null;

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
  ) => Promise<{ needsEmailVerification: boolean }>;
  verifyEmailOtp: (email: string, token: string) => Promise<void>;
  resendSignupOtp: (email: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setProfile: (profile: Profile) => void;
  /**
   * Replace the in-memory `profile` field without recomputing onboarding flags
   * or triggering a server refresh. Use only for optimistic cache parity (e.g.
   * push-notification preference toggles) where a full `setProfile` would over-fire.
   */
  replaceProfileSnapshot: (profile: Profile | null) => void;
  /**
   * Re-fetch ONLY the profile row and recompute onboarding flags against the
   * cached `hasPets`. Use after profile-only writes (address/phone, Pro
   * entitlement sync, onboarding_complete flip) where pet counts cannot have
   * changed. One Supabase round-trip vs. five for a full resolve.
   */
  refreshProfileOnly: () => Promise<void>;
  /**
   * Full server resolve: profile + owned pet count + co-care pet count +
   * pending invites + co-care removal notifs. Use after co-care membership
   * changes (accept invite / remove co-carer) or realtime co-care events.
   */
  refreshAuthSession: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => {
  /**
   * Access token from the most recent successful `resolveSession` call. Used to
   * dedupe the cold-start `onAuthStateChange("INITIAL_SESSION")` callback that
   * fires immediately after `initialize()` already resolved the same session,
   * which otherwise triggers a redundant Supabase round-trip on every launch.
   * Reset to `null` on logout so a fresh sign-in always re-resolves.
   */
  let lastResolvedSessionToken: string | null = null;

  const reconcileCrittrProWithStripe = () => {
    void ensureCrittrProSyncedFromStripe().then((r) => {
      // Stripe sync only mutates profile fields (Pro entitlement); pet counts
      // can't change, so a profile-only refresh is sufficient.
      if (r === "synced") void get().refreshProfileOnly();
    });
  };

  const clearAuxiliarySessionState = () => {
    queryClient.clear();
    usePetStore.getState().clear();
    useOnboardingStore.getState().reset();
  };

  const purgeInvalidSession = async () => {
    await wipeSupabaseAuthFromDevice();
    clearAuxiliarySessionState();
    lastResolvedSessionToken = null;
    set(loggedOutState);
  };

  return {
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
          await purgeInvalidSession();
        } else {
          const {
            data: { session: latestSession },
          } = await supabase.auth.getSession();
          const activeSession = latestSession ?? session;
          const resolved = await resolveSession(activeSession);
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
            session: activeSession,
            profile: resolved.profile,
            hasPets: resolved.hasPets,
            ownedPetCount: resolved.ownedPetCount,
            coCarePetCount: resolved.coCarePetCount,
            onboardingResumeStep: resolved.onboardingResumeStep,
            isLoggedIn: true,
            needsOnboarding: resolved.needsOnboarding,
            requiresCoCareRemovedScreen,
          });
          lastResolvedSessionToken = activeSession.access_token;
          syncProfileRowToQuery(resolved.profile);
          reconcileCrittrProWithStripe();
        }
      }

      // Tear down any previous listener before registering a new one
      authListenerUnsub?.();
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session) {
            // Cold-start dedupe: `INITIAL_SESSION` fires right after `initialize()`
            // already resolved the same session. Skip the redundant round-trip
            // when the access token still matches what we just resolved.
            if (
              event === "INITIAL_SESSION" &&
              session.access_token === lastResolvedSessionToken
            ) {
              return;
            }
            const stillRegistered = await isAuthUserStillRegistered(event);
            if (!stillRegistered) {
              await purgeInvalidSession();
              return;
            }
            const {
              data: { session: latestSession },
            } = await supabase.auth.getSession();
            const activeSession = latestSession ?? session;
            const resolved = await resolveSession(activeSession);
            const prev = get();
            const requiresCoCareRemovedScreen =
              nextRequiresCoCareRemovedScreen(
                {
                  hasPets: prev.hasPets,
                  ownedPetCount: prev.ownedPetCount,
                  coCarePetCount: prev.coCarePetCount,
                  requiresCoCareRemovedScreen:
                    prev.requiresCoCareRemovedScreen,
                },
                resolved,
              );
            set({
              session: activeSession,
              profile: resolved.profile,
              hasPets: resolved.hasPets,
              ownedPetCount: resolved.ownedPetCount,
              coCarePetCount: resolved.coCarePetCount,
              onboardingResumeStep: resolved.onboardingResumeStep,
              isLoggedIn: true,
              needsOnboarding: resolved.needsOnboarding,
              requiresCoCareRemovedScreen,
            });
            lastResolvedSessionToken = activeSession.access_token;
            syncProfileRowToQuery(resolved.profile);
            if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
              reconcileCrittrProWithStripe();
            }
          } else {
            clearAuxiliarySessionState();
            lastResolvedSessionToken = null;
            set(loggedOutState);
          }
        },
      );
      authListenerUnsub = () => subscription.unsubscribe();
    } catch (error) {
      console.error("Auth initialization failed:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  signUp: async (email, password, firstName, lastName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName },
      },
    });
    if (error) throw error;
    return { needsEmailVerification: !data.session };
  },

  verifyEmailOtp: async (email, token) => {
    const { error } = await withTimeout(
      supabase.auth.verifyOtp({
        email,
        token,
        type: "signup",
      }),
      AUTH_EMAIL_ACTION_TIMEOUT_MS,
      "Confirm email",
    );
    if (error) throw error;
  },

  resendSignupOtp: async (email) => {
    const { error } = await withTimeout(
      supabase.auth.resend({
        type: "signup",
        email,
      }),
      AUTH_EMAIL_ACTION_TIMEOUT_MS,
      "Resend code",
    );
    if (error) throw error;
  },

  signInWithEmail: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    // Session resolution is handled by the onAuthStateChange listener
    // registered in initialize(). No manual getSession/resolve needed.
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    clearAuxiliarySessionState();
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
    set((s) => ({
      profile,
      ...deriveProfileOnboardingState(profile, s.hasPets),
    }));
    queryClient.setQueryData(profileQueryKey(profile.id), profile);
    void get().refreshProfileOnly();
  },

  replaceProfileSnapshot: (profile) => set({ profile }),

  refreshProfileOnly: async () => {
    const session = get().session;
    if (!session) return;
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle();
    if (error) {
      if (__DEV__) console.warn("[authStore] refreshProfileOnly failed", error);
      return;
    }
    set((s) => ({
      profile: profile ?? null,
      ...deriveProfileOnboardingState(profile ?? null, s.hasPets),
    }));
    syncProfileRowToQuery(profile ?? null);
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
    await get().refreshProfileOnly();
  },
};
});
