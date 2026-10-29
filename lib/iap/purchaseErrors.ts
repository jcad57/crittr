/**
 * Turns a raw RevenueCat SDK rejection into something the checkout screen can
 * act on.
 *
 * Google Play produces outcomes StoreKit simply doesn't have, and treating
 * them as generic failures is what makes an Android paywall feel broken:
 *
 *   - `PAYMENT_PENDING_ERROR` — the order was placed but needs to clear (cash
 *     at a convenience store, a parent approving a child's purchase, some
 *     carrier billing). The user did nothing wrong and must not be told to
 *     retry, or they'll end up owning the product twice.
 *   - `PRODUCT_ALREADY_PURCHASED_ERROR` — Play's ITEM_ALREADY_OWNED. Routine
 *     on Android after a reinstall or when a purchase landed under a
 *     different app login. The fix is to activate, never to charge again.
 *   - `PURCHASE_NOT_ALLOWED_ERROR` — the device/account cannot buy right now.
 *   - `STORE_PROBLEM_ERROR` / `OPERATION_ALREADY_IN_PROGRESS_ERROR` — the
 *     transaction outcome is uncertain. Check access before another purchase.
 */

import { storeAccountLabel, storePhrase } from "@/lib/iap/storeTerms";
import { PURCHASES_ERROR_CODE } from "react-native-purchases";

/** How the caller should respond, independent of the message shown. */
export type PurchaseFailureKind =
  /** User backed out of the store sheet. Show nothing. */
  | "cancelled"
  /** Store accepted the order; it completes later. Don't charge again. */
  | "pending"
  /** This account already owns Crittr Pro. Activate instead of purchasing. */
  | "already_owned"
  /** Store receipt belongs to another Crittr login; retrying cannot fix ownership. */
  | "account_conflict"
  /** Verified test purchase on an account not enrolled for sandbox access. */
  | "sandbox_restricted"
  /** Purchases are unavailable on this device / account right now. */
  | "billing_unavailable"
  /** The store result may be incomplete; check access before another purchase. */
  | "result_unknown"
  /** Connectivity. Retrying is reasonable. */
  | "network"
  /** Anything else. */
  | "failed";

export type MappedPurchaseFailure = {
  kind: PurchaseFailureKind;
  code?: string;
  message: string;
};

type RawPurchasesError = {
  code?: string | number;
  message?: string;
  userCancelled?: boolean | null;
  underlyingErrorMessage?: string;
};

function messageForCode(code: string | undefined): string | null {
  switch (code) {
    case PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR:
      return `Your purchase is waiting on ${storePhrase()} to confirm payment. Crittr Pro unlocks automatically as soon as it clears — you won't be charged twice.`;
    case PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR:
      return "This account already has Crittr Pro. We'll restore it instead of charging you again.";
    case PURCHASES_ERROR_CODE.RECEIPT_ALREADY_IN_USE_ERROR:
    case PURCHASES_ERROR_CODE.RECEIPT_IN_USE_BY_OTHER_SUBSCRIBER_ERROR:
      return "This Apple or Google purchase is linked to another Crittr account. Sign in to the Crittr account used for the original purchase, or contact support to recover access.";
    case PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR:
      return `Purchases aren't available on this device. Make sure you're signed in to ${storePhrase()} and that purchases aren't restricted for your ${storeAccountLabel()}.`;
    case PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR:
    case PURCHASES_ERROR_CODE.OPERATION_ALREADY_IN_PROGRESS_ERROR:
      return `${storePhrase()} hasn’t confirmed the purchase result. Check access or restore purchases before trying again.`;
    case PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR:
      return `${storePhrase()} couldn't sell this Crittr Pro plan on this device. Make sure you’re signed into the store account you use for purchases, or try again on another device.`;
    case PURCHASES_ERROR_CODE.NETWORK_ERROR:
    case PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR:
      return "We couldn't reach the network. Check your connection and try again.";
    case PURCHASES_ERROR_CODE.CONFIGURATION_ERROR:
      return "Subscriptions aren't set up correctly in this build. Please update Crittr or contact support.";
    case PURCHASES_ERROR_CODE.INELIGIBLE_ERROR:
      return "This offer isn't available for your account.";
    default:
      return null;
  }
}

function kindForCode(
  code: string | undefined,
  userCancelled: boolean,
): PurchaseFailureKind {
  if (userCancelled || code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
    return "cancelled";
  }
  switch (code) {
    case PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR:
      return "pending";
    case PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR:
      return "already_owned";
    case PURCHASES_ERROR_CODE.RECEIPT_ALREADY_IN_USE_ERROR:
    case PURCHASES_ERROR_CODE.RECEIPT_IN_USE_BY_OTHER_SUBSCRIBER_ERROR:
      return "account_conflict";
    case PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR:
    case PURCHASES_ERROR_CODE.OPERATION_ALREADY_IN_PROGRESS_ERROR:
      return "result_unknown";
    case PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR:
      return "billing_unavailable";
    case PURCHASES_ERROR_CODE.NETWORK_ERROR:
    case PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR:
      return "network";
    default:
      return "failed";
  }
}

export function mapPurchasesError(
  raw: unknown,
  fallbackMessage: string,
): MappedPurchaseFailure {
  const err = (raw ?? {}) as RawPurchasesError;
  const code = typeof err.code === "string" || typeof err.code === "number" ? String(err.code) : undefined;
  const kind = kindForCode(code, Boolean(err.userCancelled));

  return {
    kind,
    code,
    message: messageForCode(code) ?? err.message ?? fallbackMessage,
  };
}
