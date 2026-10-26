import { fetchCurrentProPackages } from "@/lib/iap/checkout";
import { loginRevenueCatUser } from "@/lib/iap/revenueCat";
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/iap/withTimeout";
import {
  iosEligibilityKindFromStatus,
  resolveStoreTrialOffer,
} from "@/lib/iap/trialEligibility";
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
 * Trials are once per store account (Apple ID / Google account), not once
 * per Crittr login. A returning customer on a new Crittr account is still
 * ineligible. We only advertise a trial when the store has confirmed it.
 *
 * Google Play only returns offers the signed-in account can use, so a
 * `freePhase` on the default option *is* the answer. StoreKit attaches intro
 * offers to every product regardless of history — `UNKNOWN` must not be
 * treated as eligible (that is what used to promise a trial to returning
 * TestFlight / production Apple IDs).
 */
async function resolveTrials(
  packages: PurchasesPackage[],
): Promise<Map<string, StoreTrialOffer | null>> {
  const trials = new Map<string, StoreTrialOffer | null>();

  if (Platform.OS !== "ios") {
    for (const pkg of packages) {
      trials.set(pkg.identifier, trialOfferFromProduct(pkg.product));
    }
    return trials;
  }

  let eligibilityByProduct: Record<string, { status?: number }> = {};
  try {
    const eligibility = await withTimeout(
      Purchases.checkTrialOrIntroductoryPriceEligibility(
        packages.map((pkg) => pkg.product.identifier),
      ),
      8_000,
    );
    if (eligibility) eligibilityByProduct = eligibility;
  } catch {
    /* unknown — do not advertise a trial we cannot honour */
  }

  for (const pkg of packages) {
    const status = eligibilityByProduct[pkg.product.identifier]?.status;
    const kind = iosEligibilityKindFromStatus(
      status,
      INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE,
      INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_INELIGIBLE,
      INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_NO_INTRO_OFFER_EXISTS,
    );
    trials.set(
      pkg.identifier,
      resolveStoreTrialOffer({
        platform: "ios",
        androidFreePhase: null,
        iosIntroTrial: trialOfferFromProduct(pkg.product),
        iosEligibility: kind,
      }),
    );
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
  /**
   * Identify the Supabase user before the iOS eligibility probe so StoreKit
   * is not answering against an anonymous RC identity. Eligibility itself is
   * Apple-ID-scoped; login just keeps offerings / receipts aligned.
   */
  try {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await withTimeout(loginRevenueCatUser(data.user.id), 8_000);
    }
  } catch {
    /* offerings still load; trial copy stays conservative */
  }

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
