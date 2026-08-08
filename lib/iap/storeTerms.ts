/**
 * Platform-neutral vocabulary for anything a subscriber reads.
 *
 * The paywall, checkout and subscription screens are shared between StoreKit
 * and Google Play, so every user-facing string has to name the right store.
 * Keep the wording here rather than sprinkling `Platform.OS` checks through
 * the screens.
 *
 * Also holds the small amount of Google-specific identifier math the rest of
 * the app needs: Play subscriptions bought through Billing Library 5+ are
 * identified as `subscriptionId:basePlanId`, while App Store products are a
 * bare id.
 */

import { Platform } from "react-native";
import type {
  PurchasesIntroPrice,
  PurchasesStoreProduct,
} from "react-native-purchases";

const IS_IOS = Platform.OS === "ios";

/** Short store name, e.g. for "Billed via: Google Play". */
export function storeLabel(): string {
  return IS_IOS ? "App Store" : "Google Play";
}

/** Store name with any article it needs mid-sentence: "…couldn't reach Google Play." */
export function storePhrase(): string {
  return IS_IOS ? "the App Store" : "Google Play";
}

/** What the user calls the account holding their purchases. */
export function storeAccountLabel(): string {
  return IS_IOS ? "Apple ID" : "Google account";
}

/** Where a user redeems a promo code for this store. */
export const PLAY_REDEEM_URL = "https://play.google.com/redeem";

/**
 * Google Play products are reported as `subscriptionId:basePlanId`. Anything
 * that talks to the store by product id (e.g. `Purchases.getProducts`) wants
 * the subscription id on its own. No-op for App Store identifiers.
 */
export function baseProductId(productIdentifier: string): string {
  const separator = productIdentifier.indexOf(":");
  return separator === -1
    ? productIdentifier
    : productIdentifier.slice(0, separator);
}

/**
 * A free trial the store has confirmed this user can actually start.
 * `durationLabel` is ready to drop into copy: "7-day", "1-month", …
 */
export type StoreTrialOffer = {
  durationLabel: string;
  iso8601: string | null;
};

/** Renders a billing period the way a paywall should read it. */
export function formatTrialDuration(unit: string, value: number): string {
  const normalized = unit.toUpperCase();
  const count = Number.isFinite(value) && value > 0 ? Math.round(value) : 1;

  // Play stores a week-long trial as P1W; everyone writes that as "7-day".
  if (normalized === "WEEK") {
    return count === 1 ? "7-day" : `${count}-week`;
  }
  if (normalized === "DAY") return `${count}-day`;
  if (normalized === "MONTH") return `${count}-month`;
  if (normalized === "YEAR") return `${count}-year`;
  return `${count}-day`;
}

function trialFromIntroPrice(
  intro: PurchasesIntroPrice | null,
): StoreTrialOffer | null {
  if (!intro || intro.price !== 0) return null;
  return {
    durationLabel: formatTrialDuration(
      intro.periodUnit,
      intro.periodNumberOfUnits,
    ),
    iso8601: intro.period ?? null,
  };
}

/**
 * Reads the free trial attached to a product, if any.
 *
 * On Android this doubles as the eligibility check: Play only returns offers
 * the signed-in account can still use, so a missing `freePhase` means "this
 * user would be charged today". iOS carries intro offers on every product
 * regardless of eligibility, so callers must pair this with
 * `Purchases.checkTrialOrIntroductoryPriceEligibility`.
 */
export function trialOfferFromProduct(
  product: PurchasesStoreProduct,
): StoreTrialOffer | null {
  const freePhase = product.defaultOption?.freePhase;
  if (freePhase) {
    const period = freePhase.billingPeriod;
    return {
      durationLabel: formatTrialDuration(period.unit, period.value),
      iso8601: period.iso8601 ?? null,
    };
  }
  return trialFromIntroPrice(product.introPrice);
}
