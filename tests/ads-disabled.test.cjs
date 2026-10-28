const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadTS } = require("./load-typescript.cjs");
const flags = loadTS("config/featureFlags.ts");
const adConfig = loadTS("config/ads.ts", {
  "./featureFlags": flags,
  "react-native": { Platform: { select: (options) => options.ios } },
  "react-native-google-mobile-ads": { TestIds: {} },
}, { process: { env: {} } });

test("the central ad pause disables banners, app-open, and interstitial ads", () => {
  assert.equal(flags.ADS_ENABLED, false);
  assert.equal(adConfig.APP_OPEN_ADS_ENABLED, false);
  assert.equal(adConfig.INTERSTITIAL_ADS_ENABLED, false);
  assert.ok(Object.values(adConfig.ENABLED_AD_PLACEMENTS).every((enabled) => !enabled));
});

test("disabled interstitials never initialize the SDK and finish activity navigation immediately", async () => {
  let consentCalls = 0, completed = 0;
  const ads = loadTS("lib/showNonProInterstitial.ts", {
    "@/config/ads": adConfig,
    "@/lib/ads/trackingConsent": { ensureTrackingConsent: async () => { consentCalls++; throw Error("Should not run"); } },
    "react-native-google-mobile-ads": {},
  });
  ads.preloadNonProInterstitial();
  await ads.showNonProInterstitialThen(() => completed++);
  assert.equal(consentCalls, 0);
  assert.equal(completed, 1);
});

test("disabled ads never request ATT or advertising consent", async () => {
  const consent = loadTS("lib/ads/trackingConsent.ts", {
    "@/config/featureFlags": flags,
    "expo-tracking-transparency": { PermissionStatus: { UNDETERMINED: "undetermined" } },
    "react-native": {},
    "react-native-google-mobile-ads": {},
  });
  assert.equal((await consent.ensureTrackingConsent()).canRequestAds, false);
});
