import { Platform } from "react-native";
import { TestIds } from "react-native-google-mobile-ads";
import { ADS_ENABLED } from "./featureFlags";

/** App IDs remain in app.json. Keep existing dashboard/activity units per platform. */
const PROD_BANNER_UNIT_ID = Platform.select({
  ios: "ca-app-pub-8604165196940630/2656705698",
  android: "ca-app-pub-8604165196940630/2478635930",
  default: "ca-app-pub-8604165196940630/2656705698",
});
const PROD_INTERSTITIAL_UNIT_ID = Platform.select({
  ios: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS ?? "ca-app-pub-8604165196940630/8942902043",
  android: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID ?? "ca-app-pub-8604165196940630/8537522026",
  default: "ca-app-pub-8604165196940630/8537522026",
});

/** Use test inventory in development unless explicitly overridden. */
const USE_LIVE_AD_UNITS_IN_DEV =
  process.env.EXPO_PUBLIC_ADMOB_USE_LIVE_UNITS_IN_DEV === "1" ||
  process.env.EXPO_PUBLIC_ADMOB_USE_LIVE_UNITS_IN_DEV === "true";

function resolveUnitId(productionId: string, testId: string): string {
  return __DEV__ && !USE_LIVE_AD_UNITS_IN_DEV ? testId : productionId;
}

export const AdUnitIds = {
  banner: {
    dashboard_top: resolveUnitId(PROD_BANNER_UNIT_ID, TestIds.BANNER),
    schedule_top: resolveUnitId("ca-app-pub-8604165196940630/4421265114", TestIds.BANNER),
    pets_after_first: resolveUnitId("ca-app-pub-8604165196940630/8252698918", TestIds.BANNER),
    pet_profile_top: resolveUnitId("ca-app-pub-8604165196940630/1687290561", TestIds.BANNER),
    health_medications: resolveUnitId("ca-app-pub-8604165196940630/6748045551", TestIds.BANNER),
  },
  interstitial: {
    activity_logged: resolveUnitId(PROD_INTERSTITIAL_UNIT_ID, TestIds.INTERSTITIAL),
    pet_added: resolveUnitId("ca-app-pub-8604165196940630/1495718878", TestIds.INTERSTITIAL),
    existing_user_login: resolveUnitId("ca-app-pub-8604165196940630/9182637208", TestIds.INTERSTITIAL),
  },
} as const;

export type AdPlacement = keyof typeof AdUnitIds.banner;
export type InterstitialPlacement = keyof typeof AdUnitIds.interstitial;

export const ENABLED_AD_PLACEMENTS: Record<AdPlacement, boolean> = {
  dashboard_top: ADS_ENABLED,
  schedule_top: ADS_ENABLED,
  pets_after_first: ADS_ENABLED,
  pet_profile_top: ADS_ENABLED,
  health_medications: ADS_ENABLED,
};

export const INTERSTITIAL_ADS_ENABLED = ADS_ENABLED;
