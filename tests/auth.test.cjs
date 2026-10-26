const { test } = require("node:test");
const assert = require("node:assert/strict");
const { QueryClient } = require("@tanstack/react-query");
const { loadTS } = require("./load-typescript.cjs");
test("sign-out fences pending hydration and auth listeners return synchronously", async () => {
  const cache = new QueryClient();
  let generation = 0,
    listener,
    resolve,
    resolveCalls = 0;
  const pending = new Promise((r) => {
    resolve = r;
  });
  const storeStub = { getState: () => ({ reset() {}, clear() {} }) };
  const supabase = {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: (fn) => {
        listener = fn;
        return { data: { subscription: { unsubscribe() {} } } };
      },
    },
  };
  const { useAuthStore: store } = loadTS("stores/authStore.ts", {
    "@/lib/query/keys": { profileQueryKey: (id) => ["profile", id] },
    "@/lib/auth/resolveSession": {
      deriveProfileOnboardingState: () => ({}),
      nextRequiresCoCareRemovedScreen: () => false,
      resolveSession: () => {
        resolveCalls++;
        return pending;
      },
    },
    "@/lib/auth/authSnapshot": {
      clearAuthSnapshot: async () => {},
      readAuthSnapshot: async () => null,
      writeAuthSnapshot: async () => {},
    },
    "@/lib/query/persistence": {
      purgePersistedQueryCache: async () => {},
      startQueryCachePersistence: async () => {},
    },
    "@/lib/analytics": {
      clearAnalyticsUser() {},
      identifyAnalyticsUser() {},
      trackLogin() {},
      trackSignUp() {},
      trackTutorialComplete() {},
    },
    "@/lib/auth/sessionValidity": {
      isAuthUserStillRegistered: async () => true,
    },
    "@/lib/prefetchSessionData": {
      prefetchLoggedInSessionData: async () => {},
    },
    "@/lib/iap/crittrProClientState": {
      ingestProfileMirror() {},
      resetCrittrProClientState() {},
    },
    "@/services/auth": {},
    "@/lib/auth/googleOAuth": { signOutGoogleSdk: async () => {} },
    "@/lib/sessionGeneration": {
      sessionGeneration: () => generation,
      advanceSessionGeneration: () => ++generation,
    },
    "@/stores/activityFormStore": { useActivityFormStore: storeStub },
    "@/services/profiles": { fetchProfile: async () => null },
    "@/lib/secureStorage": { secureStorage: { getItem: async () => null } },
    "@/lib/supabase": {
      supabase,
      wipeSupabaseAuthFromDevice: async () => {},
      getSupabaseAuthStorageKey: () => "session",
    },
    "@/lib/iap/entitlementSync": {
      syncCrittrProForSession: async () => "skipped",
    },
    "@/lib/iap/revenueCat": { logoutRevenueCatUser: async () => {} },
    "@/lib/query/client": { queryClient: cache },
    "@/stores/onboardingStore": { useOnboardingStore: storeStub },
    "@/stores/petStore": { usePetStore: storeStub },
    "@/utils/async": loadTS("utils/async.ts"),
    zustand: require("zustand"),
  });
  const initial = store.getState().initialize();
  assert.equal(store.getState().initialize(), initial);
  await initial;
  const session = { access_token: "old-token", user: { id: "old-user" } };
  const hydration = store.getState().hydrateFromSupabaseSession(session);
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(listener("TOKEN_REFRESHED", session), undefined);
  await store.getState().signOut();
  resolve({
    profile: { id: "old-user" },
    hasPets: true,
    ownedPetCount: 1,
    coCarePetCount: 0,
    needsOnboarding: false,
  });
  assert.equal(await hydration, false);
  assert.equal(store.getState().isLoggedIn, false);
  assert.equal(store.getState().session, null);
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(resolveCalls, 1);
  let finishRead;
  supabase.auth.getSession = () =>
    new Promise((resolve) => {
      finishRead = resolve;
    });
  const syncing = store.getState().syncSessionFromSupabase();
  await store.getState().signOut();
  finishRead({ data: { session } });
  assert.equal(await syncing, false);
  assert.equal(resolveCalls, 1);
  cache.clear();
});

test("cached account shell becomes ready before network validation", async () => {
  const cache = new QueryClient();
  const cachedSession = {
    access_token: "cached",
    refresh_token: "refresh",
    user: { id: "old-user" },
  };
  const snapshot = {
    profile: { id: "old-user" },
    hasPets: true,
    ownedPetCount: 1,
    coCarePetCount: 0,
    needsOnboarding: false,
  };
  let finishSession;
  let generation = 0,
    listener,
    resolve,
    resolveCalls = 0;
  const pending = new Promise((r) => {
    resolve = r;
  });
  const storeStub = { getState: () => ({ reset() {}, clear() {} }) };
  const supabase = {
    auth: {
      getSession: () =>
        new Promise((resolve) => {
          finishSession = resolve;
        }),
      onAuthStateChange: (fn) => {
        listener = fn;
        return { data: { subscription: { unsubscribe() {} } } };
      },
    },
  };
  const { useAuthStore: store } = loadTS("stores/authStore.ts", {
    "@/lib/query/keys": { profileQueryKey: (id) => ["profile", id] },
    "@/lib/auth/resolveSession": {
      deriveProfileOnboardingState: () => ({}),
      nextRequiresCoCareRemovedScreen: () => false,
      resolveSession: () => {
        resolveCalls++;
        return pending;
      },
    },
    "@/lib/auth/authSnapshot": {
      clearAuthSnapshot: async () => {},
      readAuthSnapshot: async () => snapshot,
      writeAuthSnapshot: async () => {},
    },
    "@/lib/query/persistence": {
      purgePersistedQueryCache: async () => {},
      startQueryCachePersistence: async () => {},
    },
    "@/lib/analytics": {
      clearAnalyticsUser() {},
      identifyAnalyticsUser() {},
      trackLogin() {},
      trackSignUp() {},
      trackTutorialComplete() {},
    },
    "@/lib/auth/sessionValidity": {
      isAuthUserStillRegistered: async () => true,
    },
    "@/lib/prefetchSessionData": {
      prefetchLoggedInSessionData: async () => {},
    },
    "@/lib/iap/crittrProClientState": {
      ingestProfileMirror() {},
      resetCrittrProClientState() {},
    },
    "@/services/auth": {},
    "@/lib/auth/googleOAuth": { signOutGoogleSdk: async () => {} },
    "@/lib/sessionGeneration": {
      sessionGeneration: () => generation,
      advanceSessionGeneration: () => ++generation,
    },
    "@/stores/activityFormStore": { useActivityFormStore: storeStub },
    "@/services/profiles": { fetchProfile: async () => null },
    "@/lib/secureStorage": {
      secureStorage: { getItem: async () => JSON.stringify(cachedSession) },
    },
    "@/lib/supabase": {
      supabase,
      wipeSupabaseAuthFromDevice: async () => {},
      getSupabaseAuthStorageKey: () => "session",
    },
    "@/lib/iap/entitlementSync": {
      syncCrittrProForSession: async () => "skipped",
    },
    "@/lib/iap/revenueCat": { logoutRevenueCatUser: async () => {} },
    "@/lib/query/client": { queryClient: cache },
    "@/stores/onboardingStore": { useOnboardingStore: storeStub },
    "@/stores/petStore": { usePetStore: storeStub },
    "@/utils/async": loadTS("utils/async.ts"),
    zustand: require("zustand"),
  });
  const initializing = store.getState().initialize();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(store.getState().isLoggedIn, true);
  assert.equal(store.getState().isLoading, false);
  assert.equal(store.getState().needsOnboarding, false);
  assert.equal(resolveCalls, 0);
  finishSession({ data: { session: cachedSession } });
  await initializing;
  await store.getState().signOut();
  cache.clear();
});
