import type { TrackingConsentResult } from "@/lib/ads/trackingConsent";
import { ensureMobileAdsInitialized } from "@/lib/ads/initialize";
import { PermissionStatus } from "expo-tracking-transparency";
import { useEffect, useState } from "react";

const DEFAULT: TrackingConsentResult = {
  canRequestAds: false,
  personalizedAds: false,
  attStatus: PermissionStatus.UNDETERMINED,
};

/**
 * Ads stay blocked until UMP, ATT, and SDK initialization have completed.
 */
export function useTrackingConsent(): TrackingConsentResult {
  const [state, setState] = useState<TrackingConsentResult>(DEFAULT);

  useEffect(() => {
    let cancelled = false;
    void ensureMobileAdsInitialized()
      .then((result) => {
        if (!cancelled) setState(result);
      })
      .catch(() => {
        /* Keep ads blocked when initialization fails. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
