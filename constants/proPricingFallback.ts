import type { ProPricing } from "@/services/proPricing";

/**
 * Shown until live RevenueCat prices load (offering catalog hasn't returned)
 * or if the device cannot reach the IAP store. Keep roughly aligned with the
 * App Store Connect / Play Console list prices.
 */
export const PRO_PRICING_FALLBACK: ProPricing = {
  monthly: {
    priceId: "",
    unitAmount: 499,
    currency: "usd",
    formatted: "$4.99",
    interval: "month",
  },
  annual: {
    priceId: "",
    unitAmount: 3999,
    currency: "usd",
    formatted: "$39.99",
    interval: "year",
    equivalentMonthlyFormatted: "$3.33",
    savingsVsMonthlyPercent: 33,
  },
};
