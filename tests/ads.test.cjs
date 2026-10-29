const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadTS } = require("./load-typescript.cjs");

function config(platform = "ios", dev = false, env = {}) {
  return loadTS("config/ads.ts", {
    "./featureFlags": loadTS("config/featureFlags.ts"),
    "react-native": { Platform: { select: (options) => options[platform] } },
    "react-native-google-mobile-ads": { TestIds: { BANNER: "test-banner", INTERSTITIAL: "test-interstitial" } },
  }, { __DEV__: dev, process: { env } });
}

function harness(options = {}) {
  const created = [];
  let sdkCalls = 0, completed = 0, active = false;
  const timers = new Map();
  const events = { LOADED: "loaded", ERROR: "error", CLOSED: "closed" };
  const service = loadTS("lib/showNonProInterstitial.ts", {
    "@/config/ads": options.disabled ? { ...config(), INTERSTITIAL_ADS_ENABLED: false } : config(),
    "@/lib/ads/initialize": { ensureMobileAdsInitialized: async () => {
      sdkCalls++;
      if (options.sdk) return options.sdk();
      return { canRequestAds: options.consent !== false, personalizedAds: false };
    } },
    "@/lib/ads/fullScreenAdState": {
      setFullScreenAdActive(value) { active = value; },
      async markFullScreenAdShownNow() {},
    },
    "react-native-google-mobile-ads": {
      AdEventType: events,
      InterstitialAd: { createForAdRequest(unitId, requestOptions) {
        if (options.createThrows) throw Error("create failed");
        const listeners = new Map();
        const ad = {
          unitId, requestOptions, loaded: false, destroyed: false, shows: 0,
          addAdEventListener(event, callback) {
            if (!listeners.has(event)) listeners.set(event, new Set());
            listeners.get(event).add(callback);
            return () => listeners.get(event).delete(callback);
          },
          emit(event) {
            if (event === events.LOADED) this.loaded = true;
            if (event === events.ERROR || event === events.CLOSED) this.loaded = false;
            for (const callback of [...(listeners.get(event) ?? [])]) callback();
          },
          load() {
            if (options.loadThrows) throw Error("load failed");
            if (options.loadError) this.emit(events.ERROR);
            else if (!options.manualLoad) this.emit(events.LOADED);
          },
          show() {
            this.shows++;
            if (options.showThrows) throw Error("show failed");
            return options.showRejects ? Promise.reject(Error("show failed")) : Promise.resolve();
          },
          destroy() { this.destroyed = true; listeners.clear(); },
        };
        created.push(ad);
        return ad;
      } },
    },
  }, { setTimeout: (callback) => { const key = {}; timers.set(key, callback); return key; }, clearTimeout: (key) => timers.delete(key) });
  return { service, created, events, timers, finish: () => completed++, get sdkCalls() { return sdkCalls; }, get completed() { return completed; }, get active() { return active; } };
}
const flush = () => new Promise((resolve) => setImmediate(resolve));

test("five banner slots and three interstitials use the supplied IDs; app-open is removed", () => {
  const ads = config();
  assert.equal(loadTS("config/featureFlags.ts").ADS_ENABLED, true);
  assert.equal(Object.keys(ads.AdUnitIds.banner).length, 5);
  assert.ok(Object.values(ads.ENABLED_AD_PLACEMENTS).every(Boolean));
  const suffixes = { dashboard_top: "2656705698", schedule_top: "4421265114", pets_after_first: "8252698918", pet_profile_top: "1687290561", health_medications: "6748045551" };
  for (const [placement, suffix] of Object.entries(suffixes)) assert.equal(ads.AdUnitIds.banner[placement], `ca-app-pub-8604165196940630/${suffix}`);
  assert.equal(ads.AdUnitIds.interstitial.activity_logged, "ca-app-pub-8604165196940630/8942902043");
  assert.equal(ads.AdUnitIds.interstitial.pet_added, "ca-app-pub-8604165196940630/1495718878");
  assert.equal(ads.AdUnitIds.interstitial.existing_user_login, "ca-app-pub-8604165196940630/9182637208");
  assert.equal("appOpen" in ads.AdUnitIds, false);
  assert.equal(config("android").AdUnitIds.banner.dashboard_top, "ca-app-pub-8604165196940630/2478635930");
  assert.equal(config("android").AdUnitIds.interstitial.activity_logged, "ca-app-pub-8604165196940630/8537522026");
});

test("development uses Google test inventory for every placement", () => {
  const ads = config("ios", true);
  assert.ok(Object.values(ads.AdUnitIds.banner).every((id) => id === "test-banner"));
  assert.ok(Object.values(ads.AdUnitIds.interstitial).every((id) => id === "test-interstitial"));
});

test("an ineligible user or disabled master switch never initializes or requests ads", async () => {
  for (const options of [{}, { disabled: true }]) {
    const h = harness(options);
    const allowed = () => !!options.disabled;
    h.service.preloadNonProInterstitial("activity_logged", allowed);
    await h.service.showNonProInterstitialThen("activity_logged", allowed, h.finish);
    assert.equal(h.sdkCalls, 0);
    assert.equal(h.created.length, 0);
    assert.equal(h.completed, 1);
  }
});

test("preloaded activity ad completes navigation only after dismissal", async () => {
  const h = harness();
  h.service.preloadNonProInterstitial("activity_logged", () => true);
  await flush();
  const showing = h.service.showNonProInterstitialThen("activity_logged", () => true, h.finish);
  await flush();
  assert.equal(h.created.length, 1);
  assert.equal(h.created[0].shows, 1);
  assert.equal(h.created[0].requestOptions.requestNonPersonalizedAdsOnly, true);
  assert.equal(h.completed, 0);
  assert.equal(h.active, true);
  h.created[0].emit(h.events.CLOSED);
  await showing;
  assert.equal(h.completed, 1);
  assert.equal(h.active, false);
  assert.equal(h.created[0].destroyed, true);
});

test("pet and login placements cannot consume one another's cached units", async () => {
  const h = harness();
  h.service.preloadNonProInterstitial("pet_added", () => true);
  h.service.preloadNonProInterstitial("existing_user_login", () => true);
  await flush();
  const showing = h.service.showNonProInterstitialThen("existing_user_login", () => true, h.finish);
  await flush();
  const pet = h.created.find((ad) => ad.unitId.endsWith("1495718878"));
  const login = h.created.find((ad) => ad.unitId.endsWith("9182637208"));
  assert.equal(pet.shows, 0);
  assert.equal(login.shows, 1);
  login.emit(h.events.CLOSED);
  await showing;
  h.service.discardPreloadedInterstitial("pet_added");
  assert.equal(pet.destroyed, true);
});

test("lost eligibility while loading never shows the ad", async () => {
  const h = harness({ manualLoad: true });
  let eligible = true;
  const showing = h.service.showNonProInterstitialThen("pet_added", () => eligible, h.finish);
  await flush();
  eligible = false;
  h.created[0].emit(h.events.LOADED);
  await showing;
  assert.equal(h.created[0].shows, 0);
  assert.equal(h.created[0].destroyed, true);
  assert.equal(h.completed, 1);
});

test("discarded loads cannot replace a newer preload", async () => {
  const h = harness({ manualLoad: true });
  h.service.preloadNonProInterstitial("activity_logged", () => true);
  await flush();
  h.service.discardPreloadedInterstitial("activity_logged");
  h.service.preloadNonProInterstitial("activity_logged", () => true);
  await flush();
  h.created[0].emit(h.events.LOADED);
  await flush();
  assert.equal(h.created[0].destroyed, true);
  h.created[1].emit(h.events.LOADED);
  await flush();
  const showing = h.service.showNonProInterstitialThen("activity_logged", () => true, h.finish);
  await flush();
  assert.equal(h.created[1].shows, 1);
  h.created[1].emit(h.events.CLOSED);
  await showing;
});

test("consent denial, SDK failure, load failure, and presentation failure continue exactly once", async () => {
  for (const options of [{ consent: false }, { sdk: async () => { throw Error("offline"); } }, { createThrows: true }, { loadThrows: true }, { loadError: true }, { showThrows: true }, { showRejects: true }]) {
    const h = harness(options);
    await h.service.showNonProInterstitialThen("activity_logged", () => true, h.finish);
    assert.equal(h.completed, 1);
    assert.equal(h.active, false);
  }
});

test("no-fill timeout continues navigation and releases the ad", async () => {
  const h = harness({ manualLoad: true });
  const showing = h.service.showNonProInterstitialThen("activity_logged", () => true, h.finish);
  await flush();
  for (const callback of h.timers.values()) callback();
  await showing;
  assert.equal(h.completed, 1);
  assert.equal(h.created[0].destroyed, true);
});

test("overlapping completion flows cannot present two full-screen ads", async () => {
  const h = harness();
  const first = h.service.showNonProInterstitialThen("activity_logged", () => true, h.finish);
  const second = h.service.showNonProInterstitialThen("pet_added", () => true, h.finish);
  await flush();
  assert.equal(h.created.length, 1);
  assert.equal(h.completed, 1);
  h.created[0].emit(h.events.ERROR);
  await Promise.all([first, second]);
  assert.equal(h.completed, 2);
});

test("SDK initialization waits for consent, configures once, and skips denied consent", async () => {
  for (const canRequestAds of [true, false]) {
    const calls = [];
    let resolveConsent;
    const consent = new Promise((resolve) => { resolveConsent = resolve; });
    const ads = loadTS("lib/ads/initialize.ts", {
      "@/config/featureFlags": { ADS_ENABLED: true },
      "@/lib/ads/trackingConsent": { ensureTrackingConsent: () => consent },
      "react-native-google-mobile-ads": {
        __esModule: true,
        default: () => ({ setRequestConfiguration: async () => { calls.push("configure"); }, initialize: async () => { calls.push("initialize"); } }),
        MaxAdContentRating: { PG: "PG" },
      },
    });
    const first = ads.ensureMobileAdsInitialized();
    assert.equal(first, ads.ensureMobileAdsInitialized());
    assert.equal(calls.length, 0);
    resolveConsent({ canRequestAds, personalizedAds: false });
    await first;
    assert.deepEqual(calls, canRequestAds ? ["configure", "initialize"] : []);
  }
});

test("rating and milestone prompts stay suppressed during ads and after dismissal even if storage fails", async () => {
  const state = loadTS("lib/ads/fullScreenAdState.ts", {
    "@react-native-async-storage/async-storage": { __esModule: true, default: {
      async getItem() { throw Error("storage unavailable"); },
      async setItem() { throw Error("storage unavailable"); },
    } },
  });
  assert.equal(await state.wasFullScreenAdShownRecently(), false);
  state.setFullScreenAdActive(true);
  assert.equal(await state.wasFullScreenAdShownRecently(), true);
  await state.markFullScreenAdShownNow();
  state.setFullScreenAdActive(false);
  assert.equal(await state.wasFullScreenAdShownRecently(), true);
});
