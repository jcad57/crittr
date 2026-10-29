import { ensureMobileAdsInitialized } from "@/lib/ads/initialize";
import { ADS_ENABLED } from "@/config/featureFlags";
import { useEffect } from "react";

/** One shared initialization, sequenced UMP → ATT → configuration → SDK. */
export default function AdMobBootstrap() {
  useEffect(() => {
    if (!ADS_ENABLED) return;
    void ensureMobileAdsInitialized().catch((error) => {
      if (__DEV__) console.warn("[AdMob] init failed", error);
    });
  }, []);
  return null;
}
