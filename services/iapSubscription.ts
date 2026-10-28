import { getIdentifiedRevenueCatCustomerInfo } from "@/lib/iap/revenueCat";
import {
  isCrittrProFromProfile,
  type CrittrProProfileMirror,
} from "@/lib/crittrPro";
import { sessionGeneration } from "@/lib/sessionGeneration";
import { withTimeout } from "@/lib/iap/withTimeout";
import { selectCrittrProEntitlementFromCustomerInfo } from "@/lib/iap/crittrProRevenueCat";
import { baseProductId } from "@/lib/iap/storeTerms";
import Purchases, {
  type CustomerInfo,
  type PurchasesEntitlementInfo,
  type Store,
} from "react-native-purchases";
import { Linking } from "react-native";

/**
 * Display-friendly subscription summary mirrored from RevenueCat. Field names
 * are kept compatible with the existing `SubscriptionDetails` shape
 * shape so the existing UI components (`SubscriptionDetailsView`, etc.) keep
 * working unchanged.
 */
export type SubscriptionDetails = {
  productIdentifier: string;
  status:
    | "active"
    | "trialing"
    | "canceled"
    | "expired"
    | "billing_issue"
    | "lifetime";
  planLabel: "annual" | "monthly" | "lifetime" | "granted";
  interval: "month" | "year" | null;
  /** Localized price string, e.g. "$4.99 / month". `—` when unknown. */
  priceFormatted: string;
  currency: string;
  startedAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  /** "App Store" / "Play Store" / "Promotional" — replaces card brand label. */
  storeLabel: string | null;
  /** Native deep link to manage / cancel the subscription on this device. */
  managementUrl: string | null;
  /** True when this subscription was granted by Apple Family Sharing. */
  isFamilyShared: boolean;
  /** Lifetime purchase or an explicitly identified RevenueCat lifetime promotion. */
  isLifetime: boolean;
  /** Promotional/admin access has no recurring charge or store cancellation. */
  isPromotional: boolean;
};

const PERIOD_TYPE_TO_STATUS: Record<
  string,
  SubscriptionDetails["status"] | undefined
> = {
  TRIAL: "trialing",
  INTRO: "trialing",
  PREPAID: "active",
  NORMAL: "active",
};

function storeLabel(store: Store): string {
  switch (store) {
    case "APP_STORE":
    case "MAC_APP_STORE":
      return "App Store";
    case "PLAY_STORE":
      return "Google Play";
    case "AMAZON":
      return "Amazon";
    case "PROMOTIONAL":
      return "Promotional";
    case "STRIPE":
      return "Stripe";
    case "RC_BILLING":
    case "EXTERNAL":
    case "PADDLE":
    case "TEST_STORE":
      return "Subscription";
    default:
      return "Subscription";
  }
}

/**
 * Google Play carries the cadence on the base plan rather than the
 * subscription, so check both. `productPlanIdentifier` is Play-only and null
 * on the App Store.
 */
function planLabelFromProductId(
  productId: string,
  productPlanIdentifier: string | null,
  isLifetime: boolean,
): SubscriptionDetails["planLabel"] {
  if (isLifetime) return "lifetime";
  const lower = `${productId} ${productPlanIdentifier ?? ""}`.toLowerCase();
  if (
    lower.includes("annual") ||
    lower.includes("year") ||
    lower.includes("p1y")
  ) {
    return "annual";
  }
  return "monthly";
}

function intervalFromPlanLabel(
  plan: SubscriptionDetails["planLabel"],
): "month" | "year" | null {
  if (plan === "lifetime" || plan === "granted") return null;
  return plan === "annual" ? "year" : "month";
}

function hasLifetimePresentation(
  expiresAt: string | null,
  productId: string,
  store: string | null,
): boolean {
  // Some promotional lifetime records retain a far-future deadline. This is
  // presentation only: access still enforces the provider's actual expiry.
  return (
    expiresAt === null ||
    (store?.toLowerCase() === "promotional" &&
      /^rc_promo_.+_lifetime$/.test(productId))
  );
}

function statusFromEntitlement(
  ent: PurchasesEntitlementInfo,
  isLifetime: boolean,
): SubscriptionDetails["status"] {
  if (isLifetime && ent.isActive) return "lifetime";
  if (ent.billingIssueDetectedAt) return "billing_issue";
  if (ent.isActive) {
    return PERIOD_TYPE_TO_STATUS[ent.periodType] ?? "active";
  }
  if (
    ent.expirationDate &&
    new Date(ent.expirationDate).getTime() < Date.now()
  ) {
    return "expired";
  }
  return "canceled";
}

async function priceLabelForProduct(
  storeProductId: string,
  fallbackInterval: "month" | "year",
): Promise<{ priceFormatted: string; currency: string }> {
  if (!storeProductId) {
    return { priceFormatted: "—", currency: "" };
  }
  try {
    /**
     * Play identifies an owned subscription as `subscriptionId:basePlanId` but
     * only accepts the bare subscription id in a catalog lookup, and then
     * returns one product per base plan — so we query wide and pick the plan
     * the user actually holds.
     */
    const products = await Purchases.getProducts([
      baseProductId(storeProductId),
    ]);
    const product =
      products.find((p) => p.identifier === storeProductId) ?? products[0];
    if (product) {
      const period = fallbackInterval === "year" ? "year" : "month";
      const formatted = product.priceString
        ? `${product.priceString} / ${period}`
        : "—";
      return { priceFormatted: formatted, currency: product.currencyCode };
    }
  } catch (e) {
    if (__DEV__) console.warn("[iapSubscription] getProducts", e);
  }
  return { priceFormatted: "—", currency: "" };
}

/**
 * Builds the display DTO for the Subscriptions screen from RC `CustomerInfo`.
 * Returns `null` when the user has no Crittr Pro entitlement on file.
 */
export function subscriptionDetailsFromProfile(
  profile: CrittrProProfileMirror | null | undefined,
): SubscriptionDetails | null {
  if (!profile || !isCrittrProFromProfile(profile)) return null;
  const productId = profile.crittr_pro_product_id ?? "";
  const isLifetime = hasLifetimePresentation(
    profile.crittr_pro_until,
    productId,
    profile.subscription_store,
  );
  const isPromotional =
    profile.subscription_store === "promotional" ||
    profile.subscription_environment === "admin";
  const planLabel = isLifetime
    ? "lifetime"
    : isPromotional
      ? "granted"
      : planLabelFromProductId(productId, null, false);
  const managementUrl =
    profile.subscription_store === "app_store"
      ? "https://apps.apple.com/account/subscriptions"
      : profile.subscription_store === "play_store"
        ? "https://play.google.com/store/account/subscriptions"
        : null;
  return {
    productIdentifier: productId,
    status: isLifetime ? "lifetime" : "active",
    planLabel,
    interval: intervalFromPlanLabel(planLabel),
    priceFormatted: isLifetime
      ? "Lifetime access"
      : isPromotional
        ? "Complimentary access"
        : "—",
    currency: "",
    startedAt: null,
    currentPeriodStart: null,
    currentPeriodEnd: profile.crittr_pro_until,
    trialStart: null,
    trialEnd: null,
    canceledAt: null,
    cancelAtPeriodEnd:
      !isLifetime &&
      !isPromotional &&
      profile.subscription_will_renew === false,
    storeLabel: isPromotional
      ? "Promotional"
      : storeLabel((profile.subscription_store ?? "").toUpperCase() as Store),
    managementUrl: isLifetime ? null : managementUrl,
    isFamilyShared: profile.crittr_pro_ownership_type === "FAMILY_SHARED",
    isLifetime,
    isPromotional,
  };
}

export async function fetchSubscriptionDetails(
  userId: string,
  profile?: CrittrProProfileMirror | null,
): Promise<SubscriptionDetails | null> {
  const generation = sessionGeneration();
  const info: CustomerInfo | null =
    (await withTimeout(getIdentifiedRevenueCatCustomerInfo(userId), 8000)) ??
    null;
  if (generation !== sessionGeneration())
    throw new Error("Your billing account changed.");
  const verified = subscriptionDetailsFromProfile(profile);
  if (!info) {
    if (verified) return verified;
    throw new Error("We couldn't refresh your subscription. Please try again.");
  }

  const ent = selectCrittrProEntitlementFromCustomerInfo(info);
  // A grant has already been verified server-side; missing/stale device metadata
  // must not hide it or replace it with an older monthly subscription.
  if (
    verified &&
    (!ent?.isActive ||
      ent.productIdentifier !== verified.productIdentifier ||
      (ent.expirationDate == null
        ? verified.currentPeriodEnd !== null
        : Date.parse(ent.expirationDate) !==
          Date.parse(verified.currentPeriodEnd ?? "")))
  )
    return {
      ...verified,
      managementUrl: info.managementURL ?? verified.managementUrl,
    };
  if (!ent) return null;

  const productId = ent.productIdentifier;
  /**
   * `subscriptionsByProductIdentifier` is keyed the way the store names the
   * thing that was bought: the bare product on the App Store, and
   * `subscriptionId:basePlanId` on Play — which is not what the entitlement's
   * `productIdentifier` holds there.
   */
  const storeProductId = ent.productPlanIdentifier
    ? `${productId}:${ent.productPlanIdentifier}`
    : productId;
  const subRecord =
    info.subscriptionsByProductIdentifier[storeProductId] ??
    info.subscriptionsByProductIdentifier[productId];

  const isLifetime =
    ent.isActive &&
    hasLifetimePresentation(ent.expirationDate, productId, ent.store);
  const isPromotional = ent.store === "PROMOTIONAL";
  const planLabel =
    isPromotional && !isLifetime
      ? "granted"
      : planLabelFromProductId(
          productId,
          ent.productPlanIdentifier,
          isLifetime,
        );
  const interval = intervalFromPlanLabel(planLabel);
  const { priceFormatted, currency } =
    isLifetime || isPromotional
      ? {
          priceFormatted: isLifetime
            ? "Lifetime access"
            : "Complimentary access",
          currency: "",
        }
      : await priceLabelForProduct(storeProductId, interval ?? "month");

  if (generation !== sessionGeneration())
    throw new Error("Your billing account changed.");
  const cancelAtPeriodEnd =
    ent.isActive && !ent.willRenew && !isLifetime && !isPromotional;
  const status = statusFromEntitlement(ent, isLifetime);

  return {
    productIdentifier: productId,
    status,
    planLabel,
    interval,
    priceFormatted: isLifetime ? "Lifetime access" : priceFormatted,
    currency,
    startedAt: ent.originalPurchaseDate ?? null,
    currentPeriodStart:
      subRecord?.purchaseDate ?? ent.latestPurchaseDate ?? null,
    currentPeriodEnd: ent.expirationDate,
    trialStart: ent.periodType === "TRIAL" ? ent.latestPurchaseDate : null,
    trialEnd: ent.periodType === "TRIAL" ? ent.expirationDate : null,
    cancelAtPeriodEnd,
    canceledAt: ent.unsubscribeDetectedAt,
    storeLabel: storeLabel(ent.store),
    managementUrl: info.managementURL,
    isFamilyShared: ent.ownershipType === "FAMILY_SHARED",
    isLifetime,
    isPromotional,
  };
}

/**
 * App-store-managed subscriptions cannot be programmatically canceled. We
 * defer to Apple / Google's subscription management UI, which RevenueCat
 * exposes as a single helper.
 */
export async function openManageSubscriptions(
  managementUrl?: string | null,
): Promise<void> {
  // RevenueCat's URL opens the store that owns the subscription, including
  // subscriptions purchased on the user's other platform.
  if (managementUrl) {
    await Linking.openURL(managementUrl);
    return;
  }
  await Purchases.showManageSubscriptions();
}
