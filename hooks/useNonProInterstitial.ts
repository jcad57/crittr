import type { InterstitialPlacement } from "@/config/ads";
import { useCanShowAds } from "@/hooks/useCanShowAds";
import { isCrittrProFromProfile } from "@/lib/crittrPro";
import {
  discardPreloadedInterstitial,
  preloadNonProInterstitial,
  showNonProInterstitialThen,
} from "@/lib/showNonProInterstitial";
import { useAuthStore } from "@/stores/authStore";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";

/** Recheck eligibility and account identity after every asynchronous ad load. */
export function useNonProInterstitial(placement: InterstitialPlacement, enabled = true) {
  const canShowAds = useCanShowAds();
  const userId = useAuthStore((s) => s.session?.user.id);
  const latest = useRef({ canShowAds, enabled, userId });
  useLayoutEffect(() => {
    latest.current = { canShowAds, enabled, userId };
  }, [canShowAds, enabled, userId]);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      discardPreloadedInterstitial(placement);
    };
  }, [placement]);

  return useMemo(() => {
    const eligibilityForCurrentAccount = () => {
      const expectedUserId = latest.current.userId;
      return () => {
        const auth = useAuthStore.getState();
        return mounted.current && latest.current.canShowAds && latest.current.enabled &&
          !!expectedUserId && latest.current.userId === expectedUserId &&
          auth.session?.user.id === expectedUserId && auth.isLoggedIn &&
          !auth.isHydrating && !auth.needsOnboarding && !!auth.profile &&
          !isCrittrProFromProfile(auth.profile);
      };
    };
    return {
      canShowAds: canShowAds && enabled,
      preload: () => preloadNonProInterstitial(placement, eligibilityForCurrentAccount()),
      discard: () => discardPreloadedInterstitial(placement),
      showThen: (onComplete: () => void) =>
        showNonProInterstitialThen(placement, eligibilityForCurrentAccount(), onComplete),
    };
  }, [placement, canShowAds, enabled]);
}
