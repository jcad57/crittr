const { test } = require("node:test");
const assert = require("node:assert/strict");
const { QueryClient } = require("@tanstack/react-query");
const { loadTS } = require("./load-typescript.cjs");

function harness(options = {}) {
  const cache = new QueryClient();
  const session = { access_token: "token", user: { id: "user", created_at: options.newUser ? new Date().toISOString() : "2025-01-01T00:00:00Z" } };
  const profile = { id: "user", crittr_pro_active: !!options.pro };
  let generation = 0;
  const emptyStore = { getState: () => ({ reset() {}, clear() {} }) };
  const dependencies = {
    "@/lib/query/keys": { profileQueryKey: (id) => ["profile", id] },
    "@/lib/auth/resolveSession": {
      deriveProfileOnboardingState: () => ({}), nextRequiresCoCareRemovedScreen: () => false,
      resolveSession: async () => ({ profile, hasPets: !options.onboarding, needsOnboarding: !!options.onboarding, ownedPetCount: 1, coCarePetCount: 0 }),
    },
    "@/lib/auth/authSnapshot": { clearAuthSnapshot: async () => {}, readAuthSnapshot: async () => null, writeAuthSnapshot: async () => {} },
    "@/lib/query/persistence": { purgePersistedQueryCache: async () => {}, startQueryCachePersistence: async () => {} },
    "@/lib/analytics": { clearAnalyticsUser() {}, identifyAnalyticsUser() {}, trackLogin() {}, trackSignUp() {}, trackTutorialComplete() {} },
    "@/lib/auth/sessionValidity": { isAuthUserStillRegistered: async () => true },
    "@/lib/prefetchSessionData": { prefetchLoggedInSessionData: async () => {} },
    "@/lib/iap/crittrProClientState": { ingestProfileMirror() {}, resetCrittrProClientState() {} },
    "@/services/auth": { signInWithEmail: async () => session },
    "@/services/pushTokens": { unregisterExpoPushToken: async () => {} },
    "@/services/reminderNotificationSchedule": { cancelCrittrScheduledNotifications: async () => {} },
    "@/lib/auth/googleOAuth": { signOutGoogleSdk: async () => {}, signInWithGoogleNative: async () => options.cancel ? { status: "cancelled" } : { status: "success", session } },
    "@/lib/auth/appleOAuth": { signInWithAppleNative: async () => options.cancel ? { status: "cancelled" } : { status: "success", session } },
    "@/lib/sessionGeneration": { sessionGeneration: () => generation, advanceSessionGeneration: () => ++generation },
    "@/stores/activityFormStore": { useActivityFormStore: emptyStore },
    "@/services/profiles": {},
    "@/lib/secureStorage": { secureStorage: { getItem: async () => null } },
    "@/lib/medicalRecordPreviewCache": { clearMedicalRecordPreviewCache: async () => {} },
    "@/lib/supabase": { supabase: { auth: {} }, wipeSupabaseAuthFromDevice: async () => {}, getSupabaseAuthStorageKey: () => "session" },
    "@/lib/iap/revenueCat": { logoutRevenueCatUser: async () => {} },
    "@/lib/query/client": { queryClient: cache },
    "@/stores/onboardingStore": { useOnboardingStore: emptyStore },
    "@/stores/petStore": { usePetStore: emptyStore },
    "@/utils/async": loadTS("utils/async.ts"),
    zustand: require("zustand"),
  };
  const { useAuthStore: store } = loadTS("stores/authStore.ts", dependencies);
  let pathname = "/dashboard", canShowAds = true, shows = 0;
  const select = (selector) => selector(store.getState());
  select.setState = store.setState;
  const { default: Manager } = loadTS("components/ads/LoginInterstitialManager.tsx", {
    "@/hooks/queries/useProfileQuery": { useProfileQuery: () => ({ data: profile }) },
    "@/hooks/useIsCrittrPro": { useIsCrittrPro: (p) => p.crittr_pro_active },
    "@/hooks/useNonProInterstitial": { useNonProInterstitial: (placement, enabled) => {
      assert.equal(placement, "existing_user_login");
      return { canShowAds: enabled && canShowAds, showThen: async (complete) => { shows++; complete(); } };
    } },
    "@/stores/authStore": { useAuthStore: select },
    "expo-router": { usePathname: () => pathname },
    react: { useEffect: (callback) => callback() },
  });
  return { store, session, Manager, cache, get shows() { return shows; }, set pathname(value) { pathname = value; }, set canShowAds(value) { canShowAds = value; } };
}

test("existing Free users see one login ad for email, Google, and Apple sign-in", async () => {
  for (const method of ["signInWithEmail", "signInWithGoogle", "signInWithApple"]) {
    const h = harness();
    await h.store.getState()[method]("user@example.com", "password");
    assert.equal(h.store.getState().pendingLoginAdUserId, "user");
    h.Manager(); h.Manager();
    assert.equal(h.shows, 1);
    assert.equal(h.store.getState().pendingLoginAdUserId, null);
    h.cache.clear();
  }
});

test("new accounts, onboarding, and canceled social sign-ins do not queue login ads", async () => {
  for (const options of [{ newUser: true }, { onboarding: true }, { cancel: true }]) {
    const h = harness(options);
    await h.store.getState().signInWithGoogle();
    h.Manager();
    assert.equal(h.store.getState().pendingLoginAdUserId, null);
    assert.equal(h.shows, 0);
    h.cache.clear();
  }
});

test("Pro sign-in consumes the intent without requesting a login ad", async () => {
  const h = harness({ pro: true });
  await h.store.getState().signInWithEmail("user@example.com", "password");
  h.Manager();
  assert.equal(h.shows, 0);
  assert.equal(h.store.getState().pendingLoginAdUserId, null);
  h.cache.clear();
});

test("restoring or refreshing a session never queues a login ad", async () => {
  const h = harness();
  await h.store.getState().hydrateFromSupabaseSession(h.session);
  await h.store.getState().hydrateFromSupabaseSession({ ...h.session, access_token: "refreshed" });
  h.Manager();
  assert.equal(h.shows, 0);
  assert.equal(h.store.getState().pendingLoginAdUserId, null);
  h.cache.clear();
});

test("login ad waits for consent and the dashboard, and logout clears pending intent", async () => {
  const h = harness();
  await h.store.getState().signInWithEmail("user@example.com", "password");
  h.pathname = "/sign-in";
  h.Manager();
  assert.equal(h.shows, 0);
  h.pathname = "/dashboard";
  h.canShowAds = false;
  h.Manager();
  assert.equal(h.shows, 0);
  h.canShowAds = true;
  h.Manager();
  assert.equal(h.shows, 1);
  h.store.setState({ pendingLoginAdUserId: "user" });
  await h.store.getState().signOut();
  assert.equal(h.store.getState().pendingLoginAdUserId, null);
  h.cache.clear();
});
