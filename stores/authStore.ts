import { ensureCrittrProSyncedFromStripe } from "@/lib/crittrProEntitlementSync";
import { profileQueryKey } from "@/hooks/queries/queryKeys";
import { queryClient } from "@/lib/queryClient";
import { supabase, wipeSupabaseAuthFromDevice } from "@/lib/supabase";
import { ONBOARDING_STEPS, useOnboardingStore } from "@/stores/onboardingStore";
import { usePetStore } from "@/stores/petStore";
import type { Profile } from "@/types/database";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { create } from "zustand";

const PROFILE_STEP = ONBOARDING_STEPS.indexOf("profile");
const PENDING_INVITES_STEP = ONBOARDING_STEPS.indexOf("pending-invites");
const PET_TYPE_STEP = ONBOARDING_STEPS.indexOf("pet-type");

const AUTH_EMAIL_ACTION_TIMEOUT_MS = 45_000;

/** Avoid hanging the whole Supabase client on a stuck `refreshSession()` (blocks sign-out & DB). */
const AUTH_REFRESH_BUDGET_MS = 12_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      reject(
        new Error(
          `${label} timed out. Check your connection and try again.`,
        ),
      );
    }, ms);
    promise
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });
}

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

function isLikelyTransientAuthFailure(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  const message = String((error as Error)?.message ?? "").toLowerCase();
  const name = (error as { name?: string })?.name;

  if (name === "AuthRetryableFetchError") return true;

  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("internet") ||
    message.includes("timeout") ||
    message.includes("connection") ||
    message.includes("offline")
  ) {
    return true;
  }
  if (status === 0) return true;
  if (typeof status === "number" && status >= 500) return true;
  if (status === 429) return true;
  return false;
}

/**
 * `getSession()` only reads persisted tokens. After auth user deletion, the access JWT can
 * still verify locally while `profiles` is gone — `resolveSession` then sends users to
 * onboarding. `refreshSession()` hits the Auth server with the refresh token; deleted
 * users lose valid refresh tokens, so this reliably detects removal.
 *
 * If refresh fails for **any** reason that is not clearly transient (network / 5xx / 429),
 * we treat the session as invalid — do **not** fall back to `getUser()` alone, because
 * `getUser()` can still succeed on a locally-valid JWT while the account is gone.
 * Only on transient refresh failures do we fall back to `getUser()` for offline tolerance.
 *
 * `INITIAL_SESSION` must not call `refreshSession()`: `initialize()` already refreshed on
 * cold start, and a second refresh here serializes behind the same GoTrue lock and can
 * stall sign-out and PostgREST across the app.
 */
async function isAuthUserStillRegistered(
  event?: AuthChangeEvent,
): Promise<boolean> {
  /**
   * Session is already server-valid for these events, or was validated in `initialize()`
   * before this listener ran (`INITIAL_SESSION`).
   */
  if (
    event === "TOKEN_REFRESHED" ||
    event === "USER_UPDATED" ||
    event === "SIGNED_IN" ||
    event === "INITIAL_SESSION"
  ) {
    return true;
  }

  const refreshRace = await Promise.race([
    supabase.auth.refreshSession().then((r) => ({ tag: "refresh" as const, r })),
    sleep(AUTH_REFRESH_BUDGET_MS).then(() => ({ tag: "timeout" as const })),
  ]);

  if (refreshRace.tag === "timeout") {
    const { data, error: userError } = await supabase.auth.getUser();
    if (!userError && !data?.user) return false;
    if (userError && !isLikelyTransientAuthFailure(userError)) return false;
    return true;
  }

  const { data: refreshed, error: refreshError } = refreshRace.r;

  if (!refreshError && refreshed?.session) {
    return true;
  }

  if (!refreshError && !refreshed?.session) {
    return false;
  }

  if (refreshError && isLikelyTransientAuthFailure(refreshError)) {
    const { data, error: userError } = await supabase.auth.getUser();
    if (!userError && !data?.user) return false;
    if (userError && !isLikelyTransientAuthFailure(userError)) return false;
    return true;
  }

  return false;
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
  /** Re-runs server onboarding/pet checks (owned + co-care). Call after co-care changes or profile save. */
  refreshAuthSession: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => {
  const reconcileCrittrProWithStripe = () => {
    void ensureCrittrProSyncedFromStripe().then((r) => {
      if (r === "synced") void get().refreshAuthSession();
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
          syncProfileRowToQuery(resolved.profile);
          reconcileCrittrProWithStripe();
        }
      }

      // Tear down any previous listener before registering a new one
      authListenerUnsub?.();
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session) {
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
            syncProfileRowToQuery(resolved.profile);
            if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
              reconcileCrittrProWithStripe();
            }
          } else {
            clearAuxiliarySessionState();
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
};
});
