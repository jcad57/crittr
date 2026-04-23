import { AdUnitIds, INTERSTITIAL_ADS_ENABLED } from "@/constants/ads";
import mobileAds, {
  AdEventType,
  InterstitialAd,
} from "react-native-google-mobile-ads";

const LOAD_TIMEOUT_MS = 12_000;

/**
 * Loads a full-screen interstitial, shows it if inventory is available, then runs `onComplete`
 * (whether the ad was shown, failed, timed out, or the user closed it). Caller should only
 * invoke for non–Crittr Pro users after eligibility is certain.
 */
export function showNonProInterstitialThen(
  onComplete: () => void,
): Promise<void> {
  if (!INTERSTITIAL_ADS_ENABLED) {
    onComplete();
    return Promise.resolve();
  }

  return (async () => {
    try {
      await mobileAds().initialize();
    } catch {
      onComplete();
      return;
    }

    const interstitial = InterstitialAd.createForAdRequest(
      AdUnitIds.interstitial,
      { requestNonPersonalizedAdsOnly: false },
    );

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutId);
      for (const u of unsubs) {
        try {
          u();
        } catch {
          // ignore
        }
      }
      unsubs.length = 0;
      onComplete();
    };

    const unsubs: (() => void)[] = [];
    unsubs.push(
      interstitial.addAdEventListener(AdEventType.LOADED, () => {
        clearTimeout(timeoutId);
        void interstitial.show();
      }),
    );
    unsubs.push(
      interstitial.addAdEventListener(AdEventType.ERROR, () => {
        finish();
      }),
    );
    unsubs.push(
      interstitial.addAdEventListener(AdEventType.CLOSED, () => {
        finish();
      }),
    );

    const timeoutId = setTimeout(() => {
      if (__DEV__) {
        console.warn(
          "[Interstitial] no fill before timeout, continuing navigation",
        );
      }
      finish();
    }, LOAD_TIMEOUT_MS);

    interstitial.load();
  })();
}
