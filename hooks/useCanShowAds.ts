import { isAdsEligible } from "@/lib/ads/adEligibility";
import { ADS_ENABLED } from "@/config/featureFlags";
import { useProfileQuery } from "@/hooks/queries";
import { useIsCrittrPro } from "@/hooks/useIsCrittrPro";
import { useTrackingConsent } from "@/hooks/useTrackingConsent";
import { useAuthStore } from "@/stores/authStore";
import { usePathname, useSegments } from "expo-router";

/**
 * Whether this client may request or display ads right now.
 *
 * Combines auth, Pro entitlement, consent, and route. App-open, banners, and
 * any future placements should use this so auth / recovery never serves ads.
 */
export function useCanShowAds(): boolean {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const needsOnboarding = useAuthStore((s) => s.needsOnboarding);
  const isHydrating = useAuthStore((s) => s.isHydrating);
  const { data: profile, isPlaceholderData, isPending } = useProfileQuery();
  const isPro = useIsCrittrPro(profile);
  const { canRequestAds } = useTrackingConsent();
  const segments = useSegments();
  const pathname = usePathname() ?? "";
  const isOnLoggedInRoute = segments.some((s) => s === "(logged-in)");

  if (!ADS_ENABLED || !canRequestAds) return false;

  return isAdsEligible({
    isLoggedIn,
    isHydrating,
    needsOnboarding,
    isPro,
    profilePending: isPending,
    profilePlaceholder: isPlaceholderData,
    isOnLoggedInRoute,
    pathname,
  });
}
