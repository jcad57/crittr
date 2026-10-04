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
import {
  formatTrialDuration,
  type StoreTrialOffer,
} from "@/lib/iap/trialEligibility";

export type { StoreTrialOffer };
export { formatTrialDuration };

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
 * Reads a free-trial *candidate* from the product payload.
 *
 * On Android this is the eligibility check: Play only returns a `freePhase`
 * on `defaultOption` when the signed-in Google account can still start one.
 * A leftover catalog `introPrice` is ignored — using it would advertise a
 * trial to returning Play users.
 *
 * On iOS, intro offers are attached to every product regardless of history.
 * Callers must pair this with StoreKit eligibility (`eligible` only).
 */
export function trialOfferFromProduct(
  product: PurchasesStoreProduct,
): StoreTrialOffer | null {
  if (Platform.OS !== "ios") {
    const freePhase = product.defaultOption?.freePhase;
    if (!freePhase) return null;
    const period = freePhase.billingPeriod;
    return {
      durationLabel: formatTrialDuration(period.unit, period.value),
      iso8601: period.iso8601 ?? null,
    };
  }
  return trialFromIntroPrice(product.introPrice);
}
