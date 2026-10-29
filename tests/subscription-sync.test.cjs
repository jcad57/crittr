const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadTS } = require("./load-typescript.cjs");
const flush = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
const pro = () => ({
  id: "account",
  crittr_pro_active: true,
  crittr_pro_until: null,
  crittr_pro_last_synced_at: new Date().toISOString(),
  subscription_environment: "promotional",
  subscription_store: "promotional",
  crittr_pro_product_id: "rc_promo_crittr_pro_lifetime",
  subscription_will_renew: false,
});

test("server sync proceeds while the native SDK is stalled and shares failure results", async () => {
  const request = deferred();
  let invokes = 0;
  const sync = loadTS("lib/iap/entitlementSync.ts", {
    "@/lib/iap/revenueCat": {
      loginRevenueCatUser: () => new Promise(() => {}),
    },
    "@/lib/iap/withTimeout": { withTimeout: (promise) => promise },
    "@/lib/sessionGeneration": { sessionGeneration: () => 1 },
    "@/lib/supabase": {
      supabase: {
        auth: {
          getSession: async () => ({
            data: { session: { user: { id: "account" } } },
          }),
        },
        functions: {
          invoke: () => {
            invokes++;
            return request.promise;
          },
        },
      },
    },
    "react-native-purchases": {},
  });
  const first = sync.syncCrittrProForSession("account");
  const second = sync.syncCrittrProOnAppLaunch("account");
  await flush();
  assert.equal(invokes, 1);
  request.resolve({ error: new Error("offline") });
  assert.deepEqual(await Promise.all([first, second]), ["failed", "failed"]);
  assert.equal(
    await sync.syncCrittrProForSession("another-account"),
    "skipped",
  );
});

test("live profile changes refresh Pro and billing details without a webhook feedback loop", async () => {
  let effect,
    cleanup,
    onProfile,
    onStatus,
    listener,
    appListener,
    removed = false;
  let refreshes = 0,
    syncs = 0,
    invalidations = 0,
    generation = 1;
  const timers = new Set();
  const state = {
    isLoggedIn: true,
    session: { user: { id: "account" } },
    refreshProfileOnly: async () => {
      refreshes++;
    },
  };
  const useAuthStore = (select) => select(state);
  useAuthStore.getState = () => state;
  const channel = {
    on: (kind, filter, callback) => {
      assert.equal(kind, "postgres_changes");
      assert.equal(filter.filter, "id=eq.account");
      onProfile = callback;
      return channel;
    },
    subscribe: (callback) => {
      onStatus = callback;
      return channel;
    },
  };
  const { default: Component } = loadTS(
    "components/iap/RevenueCatProSync.tsx",
    {
      "@/lib/iap/entitlementSync": {
        syncCrittrProFromCustomerInfo: async () => {
          syncs++;
          return "synced";
        },
        syncCrittrProOnAppLaunch: async () => {
          syncs++;
          return "synced";
        },
      },
      "@/lib/sessionGeneration": { sessionGeneration: () => generation },
      "@/lib/iap/crittrProRevenueCat": {
        entitlementFromCustomerInfo: (info) => info,
      },
      "@/lib/supabase": {
        supabase: {
          channel: () => channel,
          removeChannel: async () => {
            removed = true;
          },
        },
      },
      "@/lib/query/client": {
        queryClient: {
          invalidateQueries: async () => {
            invalidations++;
          },
        },
      },
      "@/lib/query/keys": {
        subscriptionDetailsQueryKey: (id) => ["subscriptionDetails", id],
      },
      "@/stores/authStore": { useAuthStore },
      react: {
        useEffect: (callback) => {
          effect = callback;
        },
      },
      "react-native": {
        AppState: {
          currentState: "active",
          addEventListener: (_, callback) => {
            appListener = callback;
            return { remove() {} };
          },
        },
      },
      "react-native-purchases": {
        __esModule: true,
        default: {
          addCustomerInfoUpdateListener: (callback) => {
            listener = callback;
          },
          removeCustomerInfoUpdateListener: (callback) =>
            assert.equal(callback, listener),
        },
      },
    },
    {
      setInterval: (callback) => {
        timers.add(callback);
        return callback;
      },
      clearInterval: (callback) => timers.delete(callback),
      setTimeout: (callback) => {
        timers.add(callback);
        return callback;
      },
      clearTimeout: (callback) => timers.delete(callback),
    },
  );
  Component();
  cleanup = effect();
  await flush();
  assert.equal(syncs, 1);
  const before = refreshes;
  onProfile();
  onStatus("SUBSCRIBED");
  await flush();
  assert.equal(refreshes, before + 2);
  assert.equal(invalidations, refreshes);
  assert.equal(syncs, 1);
  // An update arriving inside the cooldown gets a trailing reconciliation.
  listener({ isActive: true, expiresAt: null });
  assert.equal(timers.size, 2);
  listener({ isActive: true, expiresAt: null });
  assert.equal(timers.size, 2);
  generation++;
  const previous = refreshes;
  onProfile();
  appListener("active");
  await flush();
  assert.equal(refreshes, previous);
  cleanup();
  assert.equal(removed, true);
  assert.equal(timers.size, 0);
});

function subscriptionService(getInfo, { withTimeout = (promise) => promise, getProducts } = {}) {
  let lookups = 0,
    opened;
  const model = loadTS("lib/crittrPro.ts");
  const service = loadTS("services/iapSubscription.ts", {
    "@/lib/iap/revenueCat": { getIdentifiedRevenueCatCustomerInfo: getInfo },
    "@/lib/crittrPro": model,
    "@/lib/sessionGeneration": { sessionGeneration: () => 1 },
    "@/lib/iap/withTimeout": { withTimeout },
    "@/lib/iap/crittrProRevenueCat": loadTS("lib/iap/crittrProRevenueCat.ts", {
      "@/lib/crittrPro": model,
    }),
    "@/lib/iap/storeTerms": { baseProductId: (id) => id.split(":")[0] },
    "react-native-purchases": {
      __esModule: true,
      default: {
        getProducts: getProducts ?? (async () => {
          lookups++;
          return [];
        }),
        showManageSubscriptions: async () => {},
      },
    },
    "react-native": {
      Linking: {
        openURL: async (url) => {
          opened = url;
        },
      },
    },
  });
  return { service, lookups: () => lookups, opened: () => opened };
}

test("verified lifetime grants display when the native SDK is unavailable or stale", async () => {
  for (const info of [
    null,
    { entitlements: { active: {}, all: {} }, managementURL: null },
  ]) {
    const fixture = subscriptionService(async (id) => {
      assert.equal(id, "account");
      return info;
    });
    const details = await fixture.service.fetchSubscriptionDetails(
      "account",
      pro(),
    );
    assert.equal(details.status, "lifetime");
    assert.equal(details.currentPeriodEnd, null);
    assert.equal(details.isPromotional, true);
    assert.equal(details.cancelAtPeriodEnd, false);
    assert.equal(fixture.lookups(), 0);
  }
});

test("duration grants show complimentary access and preserve management for concurrent paid billing", async () => {
  const info = {
    entitlements: { active: {}, all: {} },
    managementURL: "https://apps.apple.com/account/subscriptions",
  };
  const { service } = subscriptionService(async () => info);
  const details = await service.fetchSubscriptionDetails("account", {
    ...pro(),
    crittr_pro_product_id: "rc_promo_crittr_pro_monthly",
    crittr_pro_until: new Date(Date.now() + 86400000).toISOString(),
  });
  assert.equal(details.planLabel, "granted");
  assert.equal(details.interval, null);
  assert.equal(details.cancelAtPeriodEnd, false);
  assert.equal(details.managementUrl, info.managementURL);
});

test("native promotional grants never query store prices or show canceled recurring billing", async () => {
  const ent = {
    isActive: true,
    productIdentifier: "rc_promo_monthly",
    expirationDate: new Date(Date.now() + 86400000).toISOString(),
    store: "PROMOTIONAL",
    willRenew: false,
  };
  const fixture = subscriptionService(async () => ({
    entitlements: { active: { crittr_pro: ent }, all: { crittr_pro: ent } },
    subscriptionsByProductIdentifier: {},
    managementURL: null,
  }));
  const details = await fixture.service.fetchSubscriptionDetails("account");
  assert.equal(details.isPromotional, true);
  assert.equal(details.planLabel, "granted");
  assert.equal(details.cancelAtPeriodEnd, false);
  assert.equal(fixture.lookups(), 0);
  await fixture.service.openManageSubscriptions(
    "https://play.google.com/store/account/subscriptions",
  );
  assert.equal(
    fixture.opened(),
    "https://play.google.com/store/account/subscriptions",
  );
});

test("a native lookup failure cannot masquerade as a verified free account", async () => {
  const { service } = subscriptionService(async () => null);
  await assert.rejects(
    () => service.fetchSubscriptionDetails("account"),
    /couldn't refresh/,
  );
  assert.equal(
    service.subscriptionDetailsFromProfile({
      ...pro(),
      crittr_pro_active: false,
    }),
    null,
  );
});

test("lifetime promotional presentation preserves finite provider deadlines and never grants expired access", () => {
  const { service } = subscriptionService(async () => null);
  const profile = { ...pro(), crittr_pro_until: "2226-10-26T00:00:00Z" };
  const details = service.subscriptionDetailsFromProfile(profile);
  assert.equal(details.status, "lifetime");
  assert.equal(details.isLifetime, true);
  assert.equal(details.currentPeriodEnd, profile.crittr_pro_until);
  assert.equal(
    service.subscriptionDetailsFromProfile({
      ...profile,
      crittr_pro_until: "2020-01-01T00:00:00Z",
    }),
    null,
  );
});

test("production SDK configuration can retry after a native initialization error", async () => {
  let calls = 0;
  const { configureRevenueCat, isRevenueCatConfigured } = loadTS(
    "lib/iap/revenueCat.ts",
    {
      "@/lib/sessionGeneration": { sessionGeneration: () => 1 },
      "react-native": { Platform: { OS: "ios" } },
      "react-native-purchases": {
        __esModule: true,
        default: {
          configure: () => {
            if (++calls === 1) throw new Error("native not ready");
          },
        },
      },
    },
    {
      process: {
        env: { EXPO_PUBLIC_REVENUECAT_API_KEY_IOS: "appl_fixture_public_key" },
      },
    },
  );
  await configureRevenueCat("account");
  assert.equal(isRevenueCatConfigured(), false);
  await configureRevenueCat("account");
  assert.equal(isRevenueCatConfigured(), true);
  assert.equal(calls, 2);
});

test("an account switch fences a pending native login before any purchase can run", async () => {
  const login = deferred();
  let generation = 1,
    nativeId = "anonymous",
    purchases = 0;
  const sdk = {
    configure() {},
    getAppUserID: async () => nativeId,
    logIn: async (id) => {
      await login.promise;
      nativeId = id;
    },
    isAnonymous: async () => false,
    logOut: async () => {
      nativeId = "anonymous";
    },
  };
  const { withRevenueCatUser, logoutRevenueCatUser } = loadTS(
    "lib/iap/revenueCat.ts",
    {
      "@/lib/sessionGeneration": { sessionGeneration: () => generation },
      "react-native": { Platform: { OS: "ios" } },
      "react-native-purchases": { __esModule: true, default: sdk },
    },
    {
      process: {
        env: { EXPO_PUBLIC_REVENUECAT_API_KEY_IOS: "appl_fixture_public_key" },
      },
    },
  );
  const oldPurchase = withRevenueCatUser("old-account", async () => {
    purchases++;
  });
  const rejected = assert.rejects(oldPurchase, /Billing account changed/);
  await flush();
  generation++;
  const logout = logoutRevenueCatUser();
  login.resolve();
  await rejected;
  await logout;
  await withRevenueCatUser("new-account", async () => {
    purchases++;
  });
  assert.equal(purchases, 1);
  assert.equal(nativeId, "new-account");
});

test("release builds reject Test Store keys before configuring the native SDK", async () => {
  for (const platform of ["ios", "android"]) {
    let configured = 0;
    const sdk = loadTS("lib/iap/revenueCat.ts", {
      "@/lib/sessionGeneration": { sessionGeneration: () => 1 },
      "react-native": { Platform: { OS: platform } },
      "react-native-purchases": { __esModule: true, default: { configure() { configured++; } } },
    }, { process: { env: {
      EXPO_PUBLIC_REVENUECAT_API_KEY_IOS: "test_fixture",
      EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID: "test_fixture",
    } } });
    await sdk.configureRevenueCat();
    assert.equal(configured, 0);assert.equal(sdk.isRevenueCatConfigured(), false);
  }
});

test("a stalled store price lookup does not hold subscription management open indefinitely", async () => {
  const price = new Promise(() => {});
  const ent = { isActive: true, productIdentifier: "annual", expirationDate: new Date(Date.now()+86400000).toISOString(), store: "APP_STORE", willRenew: true };
  const fixture = subscriptionService(async () => ({
    entitlements: { active: { crittr_pro: ent }, all: { crittr_pro: ent } }, subscriptionsByProductIdentifier: {}, managementURL: null,
  }), { getProducts: () => price, withTimeout: (promise) => promise === price ? Promise.resolve(undefined) : promise });
  const details = await fixture.service.fetchSubscriptionDetails("account");
  assert.equal(details.status, "active");assert.equal(details.priceFormatted, "—");
});

test("auth and server request timeouts return failed sync results instead of hanging callers", async () => {
  for (const stage of ["session", "request"]) {
    const stalled = new Promise(() => {});let invokes=0;
    const sync = loadTS("lib/iap/entitlementSync.ts", {
      "@/lib/iap/revenueCat": { loginRevenueCatUser: async () => null },
      "@/lib/iap/withTimeout": { withTimeout: (promise) => promise === stalled ? Promise.resolve(undefined) : promise },
      "@/lib/sessionGeneration": { sessionGeneration: () => 1 },
      "@/lib/supabase": { supabase: {
        auth: { getSession: () => stage === "session" ? stalled : Promise.resolve({ data: { session: { user: { id: "account" } } } }) },
        functions: { invoke: () => { invokes++;return stalled; } },
      } }, "react-native-purchases": {},
    });
    assert.equal(await sync.syncCrittrProForSession("account"), "failed");
    assert.equal(invokes, stage === "session" ? 0 : 1);
  }
});
