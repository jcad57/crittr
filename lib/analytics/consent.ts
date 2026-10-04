/**
 * Maps UMP + ATT into Firebase Consent Mode v2.
 *
 * Product analytics stay on (`analytics_storage`) so `first_open` and in-app
 * conversions still reach GA4. Advertising signals follow the ads gate:
 * IDFA-personalized ads require ATT + UMP; EEA users who declined UMP keep
 * ad storage off.
 */
export type TrackingConsentInput = {
  canRequestAds: boolean;
  personalizedAds: boolean;
};

export type FirebaseConsentSettings = {
  analytics_storage: boolean;
  ad_storage: boolean;
  ad_user_data: boolean;
  ad_personalization: boolean;
};

export function firebaseConsentFromTracking(
  result: TrackingConsentInput,
): FirebaseConsentSettings {
  const adsAllowed = result.canRequestAds;
  const personalized = result.personalizedAds;
  return {
    analytics_storage: true,
    ad_storage: adsAllowed,
    ad_user_data: personalized,
    ad_personalization: personalized,
  };
}
