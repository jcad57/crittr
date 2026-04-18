import type { ProPricing } from "@/services/proPricing";

/**
 * Shown until live Stripe prices load or if the pricing Edge Function fails.
 * Keep roughly aligned with production Stripe Price objects.
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
