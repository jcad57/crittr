import { Platform } from "react-native";
import { TestIds } from "react-native-google-mobile-ads";

/**
 * AdMob unit IDs. Real IDs ship in release builds; Google-provided test IDs are used in __DEV__
 * so ad delivery is verifiable without serving live inventory (and without risking account flags).
 *
 * AdMob *App IDs* (distinct from unit IDs) live in `app.json` under the
 * `react-native-google-mobile-ads` plugin; those are injected natively at build time.
 */

const PROD_BANNER_UNIT_ID = Platform.select({
  ios: "ca-app-pub-8604165196940630/2656705698",
  android: "ca-app-pub-8604165196940630/2478635930",
  default: "ca-app-pub-8604165196940630/2656705698",
});

/**
 * App open ad units (separate from banner). Create one "App open" ad unit per platform in AdMob
 * and paste the IDs here, or set `EXPO_PUBLIC_ADMOB_APP_OPEN_{IOS,ANDROID}` in EAS / `.env`.
 */
const PROD_APP_OPEN_UNIT_ID = Platform.select({
  ios:
    process.env.EXPO_PUBLIC_ADMOB_APP_OPEN_IOS ??
    "ca-app-pub-8604165196940630/6908994632",
  android:
    process.env.EXPO_PUBLIC_ADMOB_APP_OPEN_ANDROID ??
    "ca-app-pub-8604165196940630/8845104868",
  default: "ca-app-pub-8604165196940630/6908994632",
});

/**
 * In __DEV__, app open (and by default, banner) use Google's test unit IDs, so edits to the
 * production strings above are ignored unless you set this to "true" (see AdMob policy on testing).
 */
const USE_LIVE_AD_UNITS_IN_DEV =
  process.env.EXPO_PUBLIC_ADMOB_USE_LIVE_UNITS_IN_DEV === "1" ||
  process.env.EXPO_PUBLIC_ADMOB_USE_LIVE_UNITS_IN_DEV === "true";

function resolveAppOpenId() {
  if (!__DEV__ || USE_LIVE_AD_UNITS_IN_DEV) return PROD_APP_OPEN_UNIT_ID;
  return TestIds.APP_OPEN;
}

const PROD_INTERSTITIAL_UNIT_ID = Platform.select({
  ios:
    process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS ??
    "ca-app-pub-8604165196940630/3415628001",
  android:
    process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID ??
    "ca-app-pub-8604165196940630/3415628002",
  default: "ca-app-pub-8604165196940630/3415628001",
});

function resolveInterstitialId() {
  if (!__DEV__ || USE_LIVE_AD_UNITS_IN_DEV) return PROD_INTERSTITIAL_UNIT_ID;
  return TestIds.INTERSTITIAL;
}

export const AdUnitIds = {
  banner: __DEV__ ? TestIds.BANNER : PROD_BANNER_UNIT_ID,
  appOpen: resolveAppOpenId(),
  interstitial: resolveInterstitialId(),
} as const;

/**
 * Semantic placement keys so we can A/B or disable individual slots without touching call sites.
 * Add new placements here as we expand the ad surface beyond the dashboard.
 */
export type AdPlacement = "dashboard_top";

export const ENABLED_AD_PLACEMENTS: Record<AdPlacement, boolean> = {
  dashboard_top: true,
};

/** App open (cold start + resume) — set false to ship without the format. */
export const APP_OPEN_ADS_ENABLED = true;

/** Interstitial (activity submit, post-onboarding upgrade decline) for non-Pro users. */
export const INTERSTITIAL_ADS_ENABLED = true;
