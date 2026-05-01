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
import { sleep, withTimeout } from "@/utils/async";
import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";

export type { ResolvedOnboarding };

const AUTH_EMAIL_ACTION_TIMEOUT_MS = 45_000;
const AUTH_GET_SESSION_TIMEOUT_MS = 20_000;
/**
 * Per-attempt cap on `resolveSession`. Kept tight so a slow/dead first request
 * fails fast and the retry can succeed quickly (e.g. Android dev's first
 * network request after returning from the OAuth in-app browser routinely
 * takes 5-10s, which warms up subsequent calls). The global Supabase fetch
 * has its own 30s ceiling for true network hangs.
 */
const RESOLVE_SESSION_ATTEMPT_TIMEOUT_MS = 10_000;
/** 1 + 1 retry; total worst case ≈ 21s if both attempts time out. */
const RESOLVE_SESSION_MAX_ATTEMPTS = 2;

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
  isHydrating: false,
} as const;

let authListenerUnsub: (() => void) | null = null;
/** One in-flight `getSession` for `syncSessionFromSupabase` — avoids piling calls on GoTrue mutex. */
let syncSessionFromSupabaseInFlight: Promise<boolean> | null = null;
/** Single-flight `hydrateFromSupabaseSession` keyed by access token so listener + direct callers share work. */
let hydrateInFlight: { token: string; promise: Promise<boolean> } | null = null;

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
  /**
   * True while `hydrateFromSupabaseSession` is fetching the profile + pet
   * counts after a fresh session (OAuth code exchange, password sign-in, deep
   * link). UI should treat this like a "logging you in…" splash so we don't
   * route to onboarding/dashboard before the user's actual onboarding state
   * is known.
   */
  isHydrating: boolean;

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
  /**
   * OAuth (Google) via in-app browser. Session is completed by `onAuthStateChange`.
   * Resolves on cancel without throwing; throws on real errors.
   */
  signInWithGoogle: () => Promise<void>;
  /**
   * Reads the current Supabase session and runs the same resolve as the auth listener.
   * Use after OAuth code exchange so routing does not wait on async listener ordering.
   */
  syncSessionFromSupabase: () => Promise<boolean>;
  /**
   * Apply `resolveSession` + store update from a known session without calling
   * `getSession()` (avoids GoTrue mutex deadlocks right after `exchangeCodeForSession`).
   */
  hydrateFromSupabaseSession: (session: Session) => Promise<boolean>;
  /**
   * Permanently delete the server-side user and cascaded data (Edge Function).
   */
  deleteAccount: () => Promise<void>;
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
  isHydrating: false,

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
          /**
           * Use the same hydrate path as fresh sign-ins so cold start gets
           * retry + `isHydrating` for free. `refreshSession` inside
           * `isAuthUserStillRegistered` may have rotated tokens, so re-read.
           */
          const {
            data: { session: latestSession },
          } = await supabase.auth.getSession();
          await get().hydrateFromSupabaseSession(latestSession ?? session);
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
            /**
             * Do not call `getSession()` here. Operations like `updateUser` and
             * `refreshSession` run under GoTrue’s global auth lock and await
             * `onAuthStateChange` subscribers. `getSession()` also uses that
             * lock, which can deadlock the UI (e.g. “Update password” spinning
             * forever). The `session` passed to this callback is the
             * up-to-date session the client just persisted.
             */
            const activeSession = session;

            if (event === "USER_UPDATED") {
              /**
               * `updateUser` (e.g. new password) awaits this callback before its
               * promise resolves. `resolveSession` is several PostgREST round-trips
               * and can run longer than the client’s `updateUser` timeout, surfacing
               * as a false “connection” error. Apply the new session immediately,
               * then re-resolve profile/pets in the background.
               */
              set((prev) => ({
                ...prev,
                session: activeSession,
                isLoggedIn: true,
              }));
              lastResolvedSessionToken = activeSession.access_token;
              void (async () => {
                try {
                  const resolved = await resolveSession(activeSession);
                  const prevState = get();
                  const requiresCoCareRemovedScreen =
                    nextRequiresCoCareRemovedScreen(
                      {
                        hasPets: prevState.hasPets,
                        ownedPetCount: prevState.ownedPetCount,
                        coCarePetCount: prevState.coCarePetCount,
                        requiresCoCareRemovedScreen:
                          prevState.requiresCoCareRemovedScreen,
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
                } catch (e) {
                  if (__DEV__) {
                    console.warn(
                      "[authStore] USER_UPDATED follow-up resolveSession failed",
                      e,
                    );
                  }
                }
              })();
              return;
            }

            await get().hydrateFromSupabaseSession(activeSession);
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

  signInWithGoogle: async () => {
    const { signInWithGoogleWithBrowser } = await import(
      "@/lib/auth/googleOAuth",
    );
    const r = await signInWithGoogleWithBrowser();
    if (r.status === "cancelled") return;

    /**
     * `exchangeCodeForSession` already gave us the session. Hydrate once; the
     * `onAuthStateChange("SIGNED_IN")` listener will dedupe through the same
     * single-flight call. No polling/`getSession()` needed.
     */
    const ok = await get().hydrateFromSupabaseSession(r.session);
    if (!ok) {
      throw new Error(
        "Could not load your account. Check your connection and try again.",
      );
    }
  },

  hydrateFromSupabaseSession: async (session) => {
    if (!session) return false;
    if (
      hydrateInFlight &&
      hydrateInFlight.token === session.access_token
    ) {
      return hydrateInFlight.promise;
    }

    const prev = get();
    if (
      prev.isLoggedIn &&
      prev.session?.access_token === session.access_token
    ) {
      return true;
    }

    const promise = (async () => {
      /**
       * Surface a "logging you in…" state to UI so layouts don't route to
       * onboarding/dashboard before we know the user's actual onboarding
       * state. This is also the signal `app/auth/callback.tsx` uses to wait
       * for hydration on a deep-link return. We deliberately do NOT set the
       * `session` field yet — it goes in atomically with `isLoggedIn: true`
       * on success, so consumers never see a half-applied state.
       */
      set({ isHydrating: true });

      let lastError: unknown = null;
      for (let attempt = 1; attempt <= RESOLVE_SESSION_MAX_ATTEMPTS; attempt++) {
        try {
          const resolved = await withTimeout(
            resolveSession(session),
            RESOLVE_SESSION_ATTEMPT_TIMEOUT_MS,
            "Load account",
          );
          const beforeSet = get();
          const requiresCoCareRemovedScreen = nextRequiresCoCareRemovedScreen(
            {
              hasPets: beforeSet.hasPets,
              ownedPetCount: beforeSet.ownedPetCount,
              coCarePetCount: beforeSet.coCarePetCount,
              requiresCoCareRemovedScreen:
                beforeSet.requiresCoCareRemovedScreen,
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
            isHydrating: false,
          });
          lastResolvedSessionToken = session.access_token;
          syncProfileRowToQuery(resolved.profile);
          reconcileCrittrProWithStripe();
          return true;
        } catch (e) {
          lastError = e;
          if (__DEV__) {
            console.warn(
              `[authStore] resolveSession attempt ${attempt} failed`,
              e,
            );
          }
          if (attempt < RESOLVE_SESSION_MAX_ATTEMPTS) {
            await sleep(500);
          }
        }
      }

      /**
       * All attempts exhausted. Keep the persisted session intact (the user is
       * authenticated server-side), but leave `isLoggedIn` false so UI routes
       * back to sign-in / welcome. Caller can surface the failure.
       */
      set({ isHydrating: false });
      if (__DEV__) {
        console.warn(
          "[authStore] hydrateFromSupabaseSession exhausted retries",
          lastError,
        );
      }
      return false;
    })();

    hydrateInFlight = { token: session.access_token, promise };
    try {
      return await promise;
    } finally {
      if (hydrateInFlight?.promise === promise) hydrateInFlight = null;
    }
  },

  syncSessionFromSupabase: async () => {
    if (syncSessionFromSupabaseInFlight) {
      return syncSessionFromSupabaseInFlight;
    }
    syncSessionFromSupabaseInFlight = (async () => {
      try {
        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_GET_SESSION_TIMEOUT_MS,
          "Restore session",
        );
        const session = data.session;
        if (error || !session) return false;
        return await get().hydrateFromSupabaseSession(session);
      } catch (e) {
        if (__DEV__) {
          console.warn("[authStore] syncSessionFromSupabase failed", e);
        }
        return false;
      } finally {
        syncSessionFromSupabaseInFlight = null;
      }
    })();
    return syncSessionFromSupabaseInFlight;
  },

  deleteAccount: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("Not signed in.");

    const { data, error } = await supabase.functions.invoke("delete-account", {
      method: "POST",
    });

    if (error) {
      throw new Error(error.message ?? "Could not delete account.");
    }
    if (data && typeof data === "object" && data !== null && "error" in data) {
      const d = data as { error?: string; message?: string };
      throw new Error(d.message ?? d.error ?? "Could not delete account.");
    }

    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* session may already be invalid */
    }
    await wipeSupabaseAuthFromDevice();
    hydrateInFlight = null;
    syncSessionFromSupabaseInFlight = null;
    lastResolvedSessionToken = null;
    clearAuxiliarySessionState();
    set(loggedOutState);
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    clearAuxiliarySessionState();
    set(loggedOutState);
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
