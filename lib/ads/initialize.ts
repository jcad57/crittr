import { ADS_ENABLED } from "@/config/featureFlags";
import { ensureTrackingConsent, type TrackingConsentResult } from "@/lib/ads/trackingConsent";
import mobileAds, { MaxAdContentRating } from "react-native-google-mobile-ads";

let initialization: Promise<TrackingConsentResult> | null = null;

/** Consent and request configuration must settle before any placement loads. */
export function ensureMobileAdsInitialized(): Promise<TrackingConsentResult> {
  if (!initialization) {
    initialization = (async () => {
      const consent = await ensureTrackingConsent();
      if (ADS_ENABLED && consent.canRequestAds) {
        await mobileAds().setRequestConfiguration({
          maxAdContentRating: MaxAdContentRating.PG,
          tagForChildDirectedTreatment: false,
          tagForUnderAgeOfConsent: false,
        });
        await mobileAds().initialize();
      }
      return consent;
    })().catch((error) => {
      initialization = null;
      throw error;
    });
  }
  return initialization;
}
