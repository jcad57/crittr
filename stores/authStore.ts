import { profileQueryKey } from "@/lib/query/keys";
import {
  clearAnalyticsUser,
  identifyAnalyticsUser,
  trackLogin,
  trackSignUp,
  trackTutorialComplete,
} from "@/lib/analytics";
import {
  clearAuthSnapshot,
  readAuthSnapshot,
  writeAuthSnapshot,
} from "@/lib/auth/authSnapshot";
import {
  deriveProfileOnboardingState,
  nextRequiresCoCareRemovedScreen,
  resolveSession,
  type ResolvedOnboarding,
} from "@/lib/auth/resolveSession";
import { isAuthUserStillRegistered } from "@/lib/auth/sessionValidity";
import {
  ingestProfileMirror,
  resetCrittrProClientState,
} from "@/lib/iap/crittrProClientState";
import { logoutRevenueCatUser } from "@/lib/iap/revenueCat";
import { prefetchLoggedInSessionData } from "@/lib/prefetchSessionData";
import { queryClient } from "@/lib/query/client";
import { unregisterExpoPushToken } from "@/services/pushTokens";
import { cancelCrittrScheduledNotifications } from "@/services/reminderNotificationSchedule";
import {
  purgePersistedQueryCache,
  startQueryCachePersistence,
} from "@/lib/query/persistence";
import { secureStorage } from "@/lib/secureStorage";
import {
  advanceSessionGeneration,
  sessionGeneration,
} from "@/lib/sessionGeneration";
import { useActivityFormStore } from "@/stores/activityFormStore";
import {
  supabase,
  getSupabaseAuthStorageKey,
  wipeSupabaseAuthFromDevice,
} from "@/lib/supabase";
import * as authService from "@/services/auth";
import { fetchProfileRow, markOnboardingComplete } from "@/services/profiles";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { usePetStore } from "@/stores/petStore";
import type { Profile } from "@/types/database";
import { sleep, withTimeout } from "@/utils/async";
import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";

export type { ResolvedOnboarding };

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

function isRecentlyCreatedAuthUser(
  session: Session,
  windowMs = 120_000,
): boolean {
  const created = session.user.created_at;
  if (!created) return false;
  const ts = Date.parse(created);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts < windowMs;
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

let logoutInFlight: Promise<void> | null = null;
let initializationInFlight: Promise<void> | null = null;
let authListenerUnsub: (() => void) | null = null;
/** One in-flight `getSession` for `syncSessionFromSupabase` — avoids piling calls on GoTrue mutex. */
let syncSessionFromSupabaseInFlight: Promise<boolean> | null = null;
/** Single-flight `hydrateFromSupabaseSession` keyed by access token so listener + direct callers share work. */
let hydrateInFlight: { token: string; promise: Promise<boolean> } | null = null;
/** Compatibility bridge for sign-in callers; routing never waits for network prefetch. */
let dashboardReadyWait: Promise<void> = Promise.resolve();

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
  initializationError: string | null;
  isLoggedIn: boolean;
  needsOnboarding: boolean;
  /**
   * True while a fresh session is resolving onboarding state *and* the pets
   * list the dashboard gates on is being warmed. Layouts must not route to
   * the dashboard until this is false, or the home tab can freeze on
   * "Loading your dashboard…".
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
   * Native Google Sign-In → Supabase ID token. Resolves on cancel without
   * throwing; throws on real errors. New accounts skip email OTP.
   */
  signInWithGoogle: () => Promise<void>;
  /**
   * Native Sign in with Apple (iOS only) → Supabase ID token. Resolves on
   * cancel without throwing; throws on real errors.
   */
  signInWithApple: () => Promise<void>;
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
   * Resolves when the post-sign-in pets prefetch has settled (or timed out).
   * Safe to await after `hydrateFromSupabaseSession` / `signInWithEmail`.
   */
  whenDashboardReady: () => Promise<void>;
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

/**
 * Same post-auth path as email/password: resolve onboarding, then wait for the
 * dashboard pets prefetch so layouts can redirect (onboarding vs home).
 */
async function completeNativeSocialSession(
  get: () => AuthState,
  session: Session,
  method: "google" | "apple",
): Promise<void> {
  const ok = await get().hydrateFromSupabaseSession(session);
  if (!ok) {
    throw new Error(
      "Could not load your account. Check your connection and try again.",
    );
  }
  if (isRecentlyCreatedAuthUser(session)) {
    trackSignUp(method);
  } else {
    trackLogin(method);
  }
  await get().whenDashboardReady();
}

export const useAuthStore = create<AuthState>((set, get) => {
  const clearAuxiliarySessionState = (preserveReminderUserId?: string) => {
    void cancelCrittrScheduledNotifications(preserveReminderUserId).catch((error) => console.warn("[notifications] clear schedule", error));
    advanceSessionGeneration();
    hydrateInFlight = null;
    syncSessionFromSupabaseInFlight = null;
    useActivityFormStore.getState().reset();
    queryClient.clear();
    void purgePersistedQueryCache();
    void clearAuthSnapshot();
    usePetStore.getState().clear();
    useOnboardingStore.getState().reset();
    resetCrittrProClientState();
    clearAnalyticsUser();
  };

  const purgeInvalidSession = async () => {
    clearAuxiliarySessionState();
    void logoutRevenueCatUser();

    dashboardReadyWait = Promise.resolve();
    set(loggedOutState);
    await wipeSupabaseAuthFromDevice();
  };

  /**
   * Remember the routing-relevant part of the resolved session so the next cold
   * start can render the right screen before `resolveSession` comes back.
   */
  const persistAuthSnapshot = () => {
    const s = get();
    const userId = s.session?.user?.id;
    if (!userId || !s.isLoggedIn) return;
    void writeAuthSnapshot(userId, {
      profile: s.profile,
      hasPets: s.hasPets,
      ownedPetCount: s.ownedPetCount,
      coCarePetCount: s.coCarePetCount,
      needsOnboarding: s.needsOnboarding,
      onboardingResumeStep: s.onboardingResumeStep,
      requiresCoCareRemovedScreen: s.requiresCoCareRemovedScreen,
    });
  };

  const applyResolvedSession = (
    session: Session,
    resolved: ResolvedOnboarding,
  ) => {
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
      isHydrating: false,
      initializationError: null,
      needsOnboarding: resolved.needsOnboarding,
      requiresCoCareRemovedScreen,
    });

    syncProfileRowToQuery(resolved.profile);
    ingestProfileMirror(resolved.profile);
    persistAuthSnapshot();
    identifyAnalyticsUser({
      userId: session.user.id,
      profile: resolved.profile,
      ownedPetCount: resolved.ownedPetCount,
      onboardingComplete: !resolved.needsOnboarding,
    });
  };

  /**
   * Warm the pets list *after* this call stack (and GoTrue's auth lock) has
   * released. Starting that fetch from `onAuthStateChange` can hang on
   * `getSession()`, which left the dashboard stuck on its full-page spinner.
   */
  const scheduleDashboardReady = (
    session: Session,
    needsOnboarding: boolean,
  ): Promise<void> => {
    // A warm cache is an optimization, never a routing prerequisite.
    const generation = sessionGeneration();
    if (!needsOnboarding)
      setTimeout(() => {
        if (
          generation === sessionGeneration() &&
          get().session?.user.id === session.user.id
        )
          void prefetchLoggedInSessionData(session.user.id);
      }, 0);
    return Promise.resolve();
  };

  /**
   * Cold-start path for a user we already know. Applies the remembered
   * onboarding answer so routing and the first paint happen immediately, then
   * confirms the account still exists and re-resolves against the server.
   */
  const revalidateRestoredSession = async (session: Session) => {
    const generation = sessionGeneration();
    try {
      const stillRegistered = await isAuthUserStillRegistered();
      if (generation !== sessionGeneration()) return;
      if (!stillRegistered) {
        await purgeInvalidSession();
        return;
      }

      /** `refreshSession` inside the check above may have rotated tokens. */
      const {
        data: { session: latest },
      } = await supabase.auth.getSession();
      const active = latest ?? session;

      if (
        generation !== sessionGeneration() ||
        get().session?.user.id !== active.user.id
      )
        return;
      if (active.access_token !== get().session?.access_token) {
        set((prev) => ({ ...prev, session: active }));
      }

      const resolved = await resolveSession(active);

      /** The user may have signed out while this was in flight. */
      if (
        generation !== sessionGeneration() ||
        get().session?.user?.id !== active.user.id
      )
        return;

      applyResolvedSession(active, resolved);
    } catch (e) {
      /**
       * Offline or a flaky first request. The restored snapshot is still the
       * best answer we have, so leave the user where they are rather than
       * bouncing them to sign-in.
       */
      if (__DEV__) {
        console.warn("[authStore] background session revalidation failed", e);
      }
    }
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
    initializationError: null,
    isLoggedIn: false,
    needsOnboarding: false,
    isHydrating: false,

    initialize: () => {
      if (initializationInFlight) return initializationInFlight;
      const generation = sessionGeneration();
      const task = (async () => {
        set({ initializationError: null });
        authListenerUnsub?.();
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          // Supabase awaits listeners while holding the auth lock: no async work here.
          if (!session) {
            if (event === "SIGNED_OUT" && get().session) {
              clearAuxiliarySessionState();
              set(loggedOutState);
            }
            return;
          }
          if (event === "INITIAL_SESSION") return; // initialize owns the first restore.
          if (get().session?.user.id === session.user.id && get().isLoggedIn) {
            set({ session });
            if (event === "USER_UPDATED")
              setTimeout(() => {
                void get().refreshProfileOnly();
              }, 0);
            return;
          }
          if (event === "TOKEN_REFRESHED") return;
          const currentGeneration = sessionGeneration();
          setTimeout(() => {
            if (currentGeneration === sessionGeneration())
              void get().hydrateFromSupabaseSession(session);
          }, 0);
        });
        authListenerUnsub = () => subscription.unsubscribe();
        try {
          const raw = await withTimeout(
            secureStorage.getItem(getSupabaseAuthStorageKey()),
            2000,
            "Read cached session",
          );
          const cached = raw ? (JSON.parse(raw) as Session) : null;
          if (cached?.user?.id && cached.access_token && cached.refresh_token) {
            const [snapshot] = await withTimeout(
              Promise.all([
                readAuthSnapshot(cached.user.id),
                startQueryCachePersistence(
                  cached.user.id,
                  () => generation === sessionGeneration(),
                ),
              ]),
              2000,
              "Read cached account",
            );
            if (
              snapshot &&
              generation === sessionGeneration() &&
              !get().isLoggedIn
            ) {
              set({
                ...snapshot,
                session: cached,
                isLoggedIn: true,
                isLoading: false,
                isHydrating: false,
              });
              ingestProfileMirror(snapshot.profile);
            }
          }
        } catch {
          /* Supabase can still restore when a snapshot is unreadable. */
        }
        try {
          const {
            data: { session },
            error,
          } = await withTimeout(
            supabase.auth.getSession(),
            AUTH_GET_SESSION_TIMEOUT_MS,
            "Restore session",
          );
          if (generation !== sessionGeneration()) return;
          if (error) throw error;
          if (session) {
            await startQueryCachePersistence(
              session.user.id,
              () => generation === sessionGeneration(),
            );
            if (generation !== sessionGeneration()) return;
            if (
              get().isLoggedIn &&
              get().session?.user.id === session.user.id
            ) {
              set({ session });
              void revalidateRestoredSession(session);
            } else await get().hydrateFromSupabaseSession(session);
          } else if (get().isLoggedIn) await purgeInvalidSession();
        } catch {
          if (generation === sessionGeneration() && !get().isLoggedIn)
            set({
              initializationError:
                "Could not load your account. Check your connection and retry.",
            });
        } finally {
          set({ isLoading: false });
        }
      })();
      initializationInFlight = task;
      void task
        .finally(() => {
          if (initializationInFlight === task) initializationInFlight = null;
        })
        .catch(() => {});
      return task;
    },

    signUp: async (email, password, firstName, lastName) => {
      await logoutInFlight;
      const result = await authService.signUpWithEmail(
        email,
        password,
        firstName,
        lastName,
      );
      trackSignUp("email");
      return result;
    },

    verifyEmailOtp: (email, token) => authService.verifySignupOtp(email, token),

    resendSignupOtp: (email) => authService.resendSignupOtp(email),

    signInWithEmail: async (email, password) => {
      await logoutInFlight;
      const session = await authService.signInWithEmail(email, password);
      if (session && !(await get().hydrateFromSupabaseSession(session)))
        throw new Error("Could not load your account. Retry signing in.");
      trackLogin("email");
      /**
       * `signInWithPassword` awaits the `SIGNED_IN` listener, which hydrates
       * the session. Wait for the deferred pets prefetch so the dashboard
       * mounts with cache instead of a stuck full-page spinner.
       */
      await get().whenDashboardReady();
    },

    signInWithGoogle: async () => {
      await logoutInFlight;
      const { signInWithGoogleNative } = await import("@/lib/auth/googleOAuth");
      const r = await signInWithGoogleNative();
      if (r.status === "cancelled") return;
      await completeNativeSocialSession(get, r.session, "google");
    },

    signInWithApple: async () => {
      await logoutInFlight;
      const { signInWithAppleNative } = await import("@/lib/auth/appleOAuth");
      const r = await signInWithAppleNative();
      if (r.status === "cancelled") return;
      await completeNativeSocialSession(get, r.session, "apple");
    },

    whenDashboardReady: () => dashboardReadyWait,

    hydrateFromSupabaseSession: async (session) => {
      if (!session) return false;
      if (hydrateInFlight && hydrateInFlight.token === session.access_token) {
        return hydrateInFlight.promise;
      }

      const prev = get();
      if (
        prev.isLoggedIn &&
        prev.session?.access_token === session.access_token
      ) {
        return true;
      }

      /**
       * Already routed from an auth snapshot (or a prior resolve) and the JWT
       * merely rotated. Swap the session without flipping `isHydrating` or
       * contending for PostgREST — background revalidation owns that work.
       */
      if (prev.isLoggedIn && prev.session?.user?.id === session.user.id) {
        set({ session, isHydrating: false });

        return true;
      }

      if (prev.session?.user.id !== session.user.id) {
        clearAuxiliarySessionState(session.user.id);
        set({ ...loggedOutState, session });
      }
      const generation = sessionGeneration();
      const promise = (async () => {
        /**
         * Surface a "logging you in…" state to UI so layouts don't route to
         * onboarding/dashboard before we know the user's actual onboarding
         * state. This is also the signal `app/auth/callback.tsx` uses to wait
         * for hydration on a deep-link return. We deliberately do NOT set the
         * `session` field yet — it goes in atomically with `isLoggedIn: true`
         * on success, so consumers never see a half-applied state.
         */
        set({ isHydrating: true, initializationError: null });
        await startQueryCachePersistence(
          session.user.id,
          () => generation === sessionGeneration(),
        );
        if (generation !== sessionGeneration()) return false;

        let lastError: unknown = null;
        for (
          let attempt = 1;
          attempt <= RESOLVE_SESSION_MAX_ATTEMPTS;
          attempt++
        ) {
          try {
            const resolved = await withTimeout(
              resolveSession(session),
              RESOLVE_SESSION_ATTEMPT_TIMEOUT_MS,
              "Load account",
            );
            if (generation !== sessionGeneration()) return false;
            applyResolvedSession(session, resolved);
            dashboardReadyWait = scheduleDashboardReady(
              session,
              resolved.needsOnboarding,
            );
            return true;
          } catch (e) {
            if (generation !== sessionGeneration()) return false;
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
        if (generation !== sessionGeneration()) return false;
        dashboardReadyWait = Promise.resolve();
        set({
          isHydrating: false,
          initializationError:
            "Could not load your account. Check your connection and retry.",
        });
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
      const generation = sessionGeneration();
      const task = (async () => {
        try {
          const { data, error } = await withTimeout(
            supabase.auth.getSession(),
            AUTH_GET_SESSION_TIMEOUT_MS,
            "Restore session",
          );
          const session = data.session;
          if (generation !== sessionGeneration() || error || !session)
            return false;
          return await get().hydrateFromSupabaseSession(session);
        } catch (e) {
          if (__DEV__) {
            console.warn("[authStore] syncSessionFromSupabase failed", e);
          }
          return false;
        }
      })();
      syncSessionFromSupabaseInFlight = task;
      void task
        .finally(() => {
          if (syncSessionFromSupabaseInFlight === task)
            syncSessionFromSupabaseInFlight = null;
        })
        .catch(() => {});
      return task;
    },

    deleteAccount: async () => {
      const generation = sessionGeneration();
      await authService.requestAccountDeletion();
      if (generation === sessionGeneration()) await get().signOut();
    },

    signOut: () => {
      if (logoutInFlight) return logoutInFlight;
      const previousUserId = get().session?.user.id;
      clearAuxiliarySessionState();
      set(loggedOutState);
      dashboardReadyWait = Promise.resolve();
      // Reset the desired native identity immediately; do not wait for an open store sheet.
      void logoutRevenueCatUser();
      const task = (async () => {
        if (previousUserId) {
          try {
            await withTimeout(unregisterExpoPushToken(previousUserId), 4000, "Unregister notifications");
          } catch (error) {
            console.warn("[notifications] could not unregister this device", error);
          }
        }
        await wipeSupabaseAuthFromDevice();
        const { signOutGoogleSdk } = await import("@/lib/auth/googleOAuth");
        await signOutGoogleSdk();
      })();
      logoutInFlight = task;
      void task
        .finally(() => {
          if (logoutInFlight === task) logoutInFlight = null;
        })
        .catch(() => {});
      return task;
    },

    setProfile: (profile) => {
      if (profile.id !== get().session?.user.id) return;
      set((s) => ({
        profile,
        ...deriveProfileOnboardingState(profile, s.hasPets),
      }));
      queryClient.setQueryData(profileQueryKey(profile.id), profile);
      ingestProfileMirror(profile);
      persistAuthSnapshot();
      void get().refreshProfileOnly();
    },

    replaceProfileSnapshot: (profile) => {
      if (profile && profile.id !== get().session?.user.id) return;
      set({ profile });
      ingestProfileMirror(profile);
    },

    refreshProfileOnly: async () => {
      const session = get().session;
      if (!session) return;

      const generation = sessionGeneration();
      let profile: Profile | null;
      try {
        profile = await fetchProfileRow(session.user.id);
      } catch (error) {
        if (__DEV__)
          console.warn("[authStore] refreshProfileOnly failed", error);
        return;
      }

      if (
        generation !== sessionGeneration() ||
        get().session?.user.id !== session.user.id
      )
        return;
      set((s) => ({
        profile,
        ...deriveProfileOnboardingState(profile, s.hasPets),
      }));
      syncProfileRowToQuery(profile);
      ingestProfileMirror(profile);
      persistAuthSnapshot();
      identifyAnalyticsUser({
        userId: session.user.id,
        profile,
        ownedPetCount: get().ownedPetCount,
        onboardingComplete: !get().needsOnboarding,
      });
    },

    refreshAuthSession: async () => {
      const session = get().session;
      if (!session) return;
      const generation = sessionGeneration();
      const resolved = await resolveSession(session);
      if (
        generation !== sessionGeneration() ||
        get().session?.user.id !== session.user.id
      )
        return;
      applyResolvedSession(session, resolved);
    },

    completeOnboarding: async () => {
      const { session } = get();
      if (!session) throw new Error("No session");

      const generation = sessionGeneration();
      const profile = await markOnboardingComplete(session.user.id);
      if (generation !== sessionGeneration()) return;
      if (profile) {
        queryClient.setQueryData(profileQueryKey(profile.id), profile);
      }
      await get().refreshProfileOnly();
      trackTutorialComplete();
    },
  };
});
