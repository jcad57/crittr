import { ensureTrackingConsent } from "@/lib/ads/trackingConsent";
import {
  firebaseConsentFromTracking,
  setAnalyticsCollectionEnabled,
  setAnalyticsConsent,
} from "@/lib/analytics";
import { useEffect } from "react";

/**
 * Applies Firebase Consent Mode after the same UMP → ATT gate AdMob uses.
 * Collection stays enabled so Google Ads can receive `first_open` (install).
 *
 * `ensureTrackingConsent` is single-flight, so this can run beside
 * `AdMobBootstrap` without a second prompt.
 */
export default function FirebaseAnalyticsBootstrap() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = await ensureTrackingConsent();
        if (cancelled) return;
        setAnalyticsConsent(firebaseConsentFromTracking(result));
        setAnalyticsCollectionEnabled(true);
      } catch (error) {
        if (__DEV__) {
          console.warn("[analytics] consent bootstrap failed", error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
