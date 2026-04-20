import { useEffect } from "react";
import mobileAds, {
  MaxAdContentRating,
} from "react-native-google-mobile-ads";

/**
 * One-time AdMob SDK init. Safe to mount above the auth gate so ads are ready
 * by the time the dashboard renders for non-Pro users.
 *
 * `initialize()` is idempotent per process, so re-renders / hot reloads are a no-op.
 */
export default function AdMobBootstrap() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
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
