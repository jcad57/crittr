import { ensureTrackingConsent } from "@/lib/ads/trackingConsent";
import { useEffect } from "react";
import mobileAds, {
  MaxAdContentRating,
} from "react-native-google-mobile-ads";

/**
 * One-time AdMob SDK init. Sequenced so Apple's ATT prompt fires before any
 * AdMob request that could touch IDFA — App Review on iPadOS 26.4 flagged the
 * absent prompt because we previously initialized AdMob unconditionally.
 *
 * Order: UMP consent → ATT request → AdMob `initialize()`. `initialize()` is
 * idempotent per process, so re-renders / hot reloads stay a no-op.
 */
export default function AdMobBootstrap() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await ensureTrackingConsent();
        if (cancelled) return;
        await mobileAds().setRequestConfiguration({
          maxAdContentRating: MaxAdContentRating.PG,
          tagForChildDirectedTreatment: false,
          tagForUnderAgeOfConsent: false,
        });
        if (cancelled) return;
        await mobileAds().initialize();
      } catch (error) {
        if (__DEV__) {
          console.warn("[AdMob] init failed", error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
