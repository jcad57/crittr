import { PRO_PRICING_FALLBACK } from "@/constants/proPricingFallback";
import { fetchProPricing } from "@/services/proPricing";
import { useQuery } from "@tanstack/react-query";
import { proPricingQueryKey } from "./queryKeys";

const STALE_MS = 1000 * 60 * 15;

/**
 * Live Pro list prices from RevenueCat. Uses the static fallback while the
 * RC offering catalog hasn't returned yet so the upgrade screen never blocks
 * on a network round-trip. Refetches periodically so a price change in the
 * App Store / Play Store dashboards propagates without an app release.
 */
export function useProPricingQuery() {
  return useQuery({
    queryKey: proPricingQueryKey,
    queryFn: async () => (await fetchProPricing()) ?? PRO_PRICING_FALLBACK,
    placeholderData: PRO_PRICING_FALLBACK,
    staleTime: STALE_MS,
    gcTime: 1000 * 60 * 60 * 24,
  });
}
