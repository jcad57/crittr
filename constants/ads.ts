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

export const AdUnitIds = {
  banner: __DEV__ ? TestIds.BANNER : PROD_BANNER_UNIT_ID,
} as const;

/**
 * Semantic placement keys so we can A/B or disable individual slots without touching call sites.
 * Add new placements here as we expand the ad surface beyond the dashboard.
 */
export type AdPlacement = "dashboard_top";

export const ENABLED_AD_PLACEMENTS: Record<AdPlacement, boolean> = {
  dashboard_top: true,
};
