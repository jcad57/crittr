import { fetchCurrentProPackages } from "@/lib/iap/checkout";
import type { PurchasesPackage } from "react-native-purchases";

export type ProPricingTier = {
  /** RC product identifier (App Store / Play Store sku). Empty when fallback. */
  priceId: string;
  /** Price in minor units (cents) so existing UI math keeps working. */
  unitAmount: number;
  currency: string;
  formatted: string;
  interval: "month" | "year";
};

export type ProPricing = {
  monthly: ProPricingTier;
  annual: ProPricingTier & {
    equivalentMonthlyFormatted: string;
    savingsVsMonthlyPercent: number | null;
  };
};

function formatMonthlyEquivalent(annual: PurchasesPackage): string | null {
  const product = annual.product;
  if (typeof product.pricePerMonthString === "string" && product.pricePerMonthString.length > 0) {
    return product.pricePerMonthString;
  }
  const cur = product.currencyCode || "USD";
  if (typeof product.pricePerMonth === "number") {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: cur,
      }).format(product.pricePerMonth);
    } catch {
      return null;
    }
  }
  return null;
}

function packageToTier(pkg: PurchasesPackage): ProPricingTier {
  const p = pkg.product;
  const interval =
    p.subscriptionPeriod?.toUpperCase() === "P1Y" ||
    (p.pricePerYear != null && p.pricePerYear === p.price)
      ? "year"
      : "month";
  return {
    priceId: p.identifier,
    unitAmount: Math.round(p.price * 100),
    currency: (p.currencyCode || "USD").toLowerCase(),
    formatted: p.priceString || "—",
    interval,
  };
}

/**
 * Reads list prices for the Crittr Pro offering directly from RC. Returns
 * `null` when the offering is not available (caller should use the static
 * `PRO_PRICING_FALLBACK` until the user's connection / IAP setup catches up).
 */
export async function fetchProPricing(): Promise<ProPricing | null> {
  const { monthly, annual } = await fetchCurrentProPackages();
  if (!monthly || !annual) return null;

  const monthlyTier = { ...packageToTier(monthly), interval: "month" as const };
  const annualBase = packageToTier(annual);
  const annualTier: ProPricing["annual"] = {
    ...annualBase,
    interval: "year",
    equivalentMonthlyFormatted:
      formatMonthlyEquivalent(annual) ?? annualBase.formatted,
    savingsVsMonthlyPercent: (() => {
      const monthlyYearTotal = monthlyTier.unitAmount * 12;
      if (monthlyYearTotal <= 0 || annualBase.unitAmount <= 0) return null;
      if (monthlyYearTotal <= annualBase.unitAmount) return null;
      return Math.round(
        (1 - annualBase.unitAmount / monthlyYearTotal) * 100,
      );
    })(),
  };

  return {
    monthly: monthlyTier,
    annual: annualTier,
  };
}
