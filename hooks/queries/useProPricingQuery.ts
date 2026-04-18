import { PRO_PRICING_FALLBACK } from "@/constants/proPricingFallback";
import { fetchProPricing } from "@/services/proPricing";
import { useQuery } from "@tanstack/react-query";
import { proPricingQueryKey } from "./queryKeys";

const STALE_MS = 1000 * 60 * 15;

/**
 * Live Pro list prices from Stripe (prefetched on app ready).
 * Uses placeholder fallback until the network returns; refetches on a modest interval
 * so Dashboard price changes propagate without an app release.
 */
export function useProPricingQuery() {
  return useQuery({
    queryKey: proPricingQueryKey,
    queryFn: fetchProPricing,
    placeholderData: PRO_PRICING_FALLBACK,
    staleTime: STALE_MS,
    gcTime: 1000 * 60 * 60 * 24,
  });
}
