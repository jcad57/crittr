import { getRevenueCatCustomerInfo } from "@/lib/iap/revenueCat";
import { selectCrittrProEntitlementFromCustomerInfo } from "@/lib/iap/crittrProRevenueCat";
import { baseProductId } from "@/lib/iap/storeTerms";
import Purchases, {
  type CustomerInfo,
  type PurchasesEntitlementInfo,
  type Store,
} from "react-native-purchases";

/**
 * Display-friendly subscription summary mirrored from RevenueCat. Field names
 * are kept compatible with the existing `SubscriptionDetails` shape
 * shape so the existing UI components (`SubscriptionDetailsView`, etc.) keep
 * working unchanged.
 */
export type SubscriptionDetails = {
  productIdentifier: string;
  status: "active" | "trialing" | "canceled" | "expired" | "billing_issue";
  planLabel: "annual" | "monthly";
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
): SubscriptionDetails["planLabel"] {
  const lower = `${productId} ${productPlanIdentifier ?? ""}`.toLowerCase();
  if (lower.includes("annual") || lower.includes("year") || lower.includes("p1y")) {
    return "annual";
  }
  return "monthly";
}

function intervalFromPlanLabel(
  plan: SubscriptionDetails["planLabel"],
): "month" | "year" {
  return plan === "annual" ? "year" : "month";
}

function statusFromEntitlement(
  ent: PurchasesEntitlementInfo,
): SubscriptionDetails["status"] {
  if (ent.billingIssueDetectedAt) return "billing_issue";
  if (ent.isActive) {
    return PERIOD_TYPE_TO_STATUS[ent.periodType] ?? "active";
  }
  if (ent.expirationDate && new Date(ent.expirationDate).getTime() < Date.now()) {
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
export async function fetchSubscriptionDetails(): Promise<SubscriptionDetails | null> {
  const info: CustomerInfo | null = await getRevenueCatCustomerInfo();
  if (!info) return null;

  const ent = selectCrittrProEntitlementFromCustomerInfo(info);
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

  const planLabel = planLabelFromProductId(productId, ent.productPlanIdentifier);
  const interval = intervalFromPlanLabel(planLabel);
  const { priceFormatted, currency } = await priceLabelForProduct(
    storeProductId,
    interval,
  );

  const cancelAtPeriodEnd = ent.isActive && !ent.willRenew;
  const status = statusFromEntitlement(ent);

  return {
    productIdentifier: productId,
    status,
    planLabel,
    interval,
    priceFormatted,
    currency,
    startedAt: ent.originalPurchaseDate ?? null,
    currentPeriodStart: subRecord?.purchaseDate ?? ent.latestPurchaseDate ?? null,
    currentPeriodEnd: ent.expirationDate,
    trialStart: ent.periodType === "TRIAL" ? ent.latestPurchaseDate : null,
    trialEnd: ent.periodType === "TRIAL" ? ent.expirationDate : null,
    cancelAtPeriodEnd,
    canceledAt: ent.unsubscribeDetectedAt,
    storeLabel: storeLabel(ent.store),
    managementUrl: info.managementURL,
    isFamilyShared: ent.ownershipType === "FAMILY_SHARED",
  };
}

/**
 * App-store-managed subscriptions cannot be programmatically canceled. We
 * defer to Apple / Google's subscription management UI, which RevenueCat
 * exposes as a single helper.
 */
export async function openManageSubscriptions(): Promise<void> {
  await Purchases.showManageSubscriptions();
}
