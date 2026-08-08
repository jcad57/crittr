import { fetchCurrentProPackages } from "@/lib/iap/checkout";
import {
  trialOfferFromProduct,
  type StoreTrialOffer,
} from "@/lib/iap/storeTerms";
import { Platform } from "react-native";
import Purchases, {
  INTRO_ELIGIBILITY_STATUS,
  type PurchasesPackage,
} from "react-native-purchases";

export type ProPricingTier = {
  /** RC product identifier (App Store / Play Store sku). Empty when fallback. */
  priceId: string;
  /** Price in minor units (cents) so existing UI math keeps working. */
  unitAmount: number;
  currency: string;
  formatted: string;
  interval: "month" | "year";
  /**
   * Free trial this specific user can still start, as the store reports it.
   * `null` means checkout charges them today.
   */
  trial: StoreTrialOffer | null;
};

export type ProPricing = {
  /**
   * False while the static fallback is on screen. The paywall keeps its
   * pricing and trial claims neutral until the store has actually answered —
   * promising a free trial we can't honour is a store-policy problem, not
   * just a cosmetic one.
   */
  resolved: boolean;
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

/**
 * Which of these products still offer this user a free trial.
 *
 * The two stores answer this in completely different places. Google Play only
 * ever returns offers the signed-in account is eligible for, so the presence
 * of a free pricing phase on the product *is* the answer. StoreKit attaches
 * intro offers to every product regardless of history, so iOS has to ask
 * separately — and `checkTrialOrIntroductoryPriceEligibility` is iOS-only
 * (it always answers UNKNOWN on Android, which is what previously made every
 * Android user see a free-trial promise).
 */
async function resolveTrials(
  packages: PurchasesPackage[],
): Promise<Map<string, StoreTrialOffer | null>> {
  const trials = new Map<string, StoreTrialOffer | null>();
  for (const pkg of packages) {
    trials.set(pkg.identifier, trialOfferFromProduct(pkg.product));
  }

  if (Platform.OS !== "ios") return trials;

  try {
    const eligibility =
      await Purchases.checkTrialOrIntroductoryPriceEligibility(
        packages.map((pkg) => pkg.product.identifier),
      );
    for (const pkg of packages) {
      const status = eligibility[pkg.product.identifier]?.status;
      const ineligible =
        status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_INELIGIBLE ||
        status ===
          INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_NO_INTRO_OFFER_EXISTS;
      if (ineligible) trials.set(pkg.identifier, null);
    }
  } catch {
    /**
     * Leave the product-derived answer in place. An unknown eligibility
     * result is not evidence that the trial is gone.
     */
  }

  return trials;
}

function packageToTier(
  pkg: PurchasesPackage,
  trial: StoreTrialOffer | null,
): ProPricingTier {
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
    trial,
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

  const trials = await resolveTrials([monthly, annual]);

  const monthlyTier = {
    ...packageToTier(monthly, trials.get(monthly.identifier) ?? null),
    interval: "month" as const,
  };
  const annualBase = packageToTier(
    annual,
    trials.get(annual.identifier) ?? null,
  );
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
    resolved: true,
    monthly: monthlyTier,
    annual: annualTier,
  };
}
