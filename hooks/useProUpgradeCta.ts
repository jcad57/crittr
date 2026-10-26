import { useProPricingQuery } from "@/hooks/queries/useProPricingQuery";
import type { ProBillingParam } from "@/lib/iap/checkout";
import { proUpgradeCtaLabel } from "@/utils/proUpgradeCta";

/**
 * Store-backed upgrade CTA. Annual is the recommended plan, so callers that
 * don't know the selected billing period should leave the default.
 */
export function useProUpgradeCta(billing: ProBillingParam = "annual"): {
  label: string;
  accessibilityLabel: string;
} {
  const { data: pricing } = useProPricingQuery();
  const tier = billing === "monthly" ? pricing?.monthly : pricing?.annual;
  const label = proUpgradeCtaLabel({
    resolved: pricing?.resolved === true,
    trial: tier?.trial ?? null,
  });
  return { label, accessibilityLabel: label };
}
