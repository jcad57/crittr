import { PRO_PRICING_FALLBACK } from "@/constants/proPricingFallback";
import { fetchProPricing } from "@/services/proPricing";
import { useQuery } from "@tanstack/react-query";
import { proPricingQueryKey } from "@/lib/query/keys";

/**
 * Live Pro list prices from RevenueCat. Uses the static fallback while the
 * RC offering catalog hasn't returned yet so the upgrade screen never blocks
 * on a network round-trip. Refetches on mount so trial eligibility is current
 * for returning store accounts.
 */
export function useProPricingQuery() {
  return useQuery({
    queryKey: proPricingQueryKey,
    queryFn: async () => (await fetchProPricing()) ?? PRO_PRICING_FALLBACK,
    placeholderData: PRO_PRICING_FALLBACK,
    /** Eligibility is per store account and can change after a purchase. */
    staleTime: 30_000,
    gcTime: 1000 * 60 * 60 * 24,
  });
}
