import {
  ensureTrackingConsent,
  type TrackingConsentResult,
} from "@/lib/ads/trackingConsent";
import { PermissionStatus } from "expo-tracking-transparency";
import { useEffect, useState } from "react";

const DEFAULT: TrackingConsentResult = {
  canRequestAds: true,
  personalizedAds: false,
  attStatus: PermissionStatus.UNDETERMINED,
};

/**
 * Reactive view of the cached UMP+ATT result. Falls back to non-personalized ads
 * until the gate completes so we never request IDFA before the user accepted.
 */
export function useTrackingConsent(): TrackingConsentResult {
  const [state, setState] = useState<TrackingConsentResult>(DEFAULT);

  useEffect(() => {
    let cancelled = false;
    void ensureTrackingConsent()
      .then((result) => {
        if (!cancelled) setState(result);
      })
      .catch(() => {
        /* keep DEFAULT (non-personalized) */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
