import type { ProPricing } from "@/services/proPricing";

/**
 * Shown until live RevenueCat prices load (offering catalog hasn't returned)
 * or if the device cannot reach the IAP store. Keep roughly aligned with the
 * App Store Connect / Play Console list prices.
 *
 * `resolved: false` tells the paywall these numbers are indicative and that we
 * don't yet know whether this user gets a free trial, so it can avoid making a
 * promise the store may not honour.
 */
export const PRO_PRICING_FALLBACK: ProPricing = {
  resolved: false,
  monthly: {
    priceId: "",
    unitAmount: 499,
    currency: "usd",
    formatted: "$4.99",
    interval: "month",
    trial: null,
  },
  annual: {
    priceId: "",
    unitAmount: 3999,
    currency: "usd",
    formatted: "$39.99",
    interval: "year",
    trial: null,
    equivalentMonthlyFormatted: "$3.33",
    savingsVsMonthlyPercent: 33,
  },
};
