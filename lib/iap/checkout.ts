import { sessionGeneration } from "@/lib/sessionGeneration";
import { queryClient } from "@/lib/query/client";
import { profileQueryKey } from "@/lib/query/keys";
import { isCrittrProFromProfile } from "@/lib/crittrPro";
import {
  ingestProfileMirror,
  ingestRevenueCatCustomerInfo,
} from "@/lib/iap/crittrProClientState";
import { type ProActivationSource } from "@/lib/iap/proActivation";
import { customerInfoHasCrittrPro as rcCustomerInfoHasCrittrPro } from "@/lib/iap/crittrProRevenueCat";
import {
  mapPurchasesError,
  type PurchaseFailureKind,
} from "@/lib/iap/purchaseErrors";
import {
  canMakeStorePayments,
  configureRevenueCat,
  getIdentifiedRevenueCatCustomerInfo,
  isRevenueCatConfigured,
  withRevenueCatUser,
} from "@/lib/iap/revenueCat";
import {
  syncCrittrProAfterCheckout,
  syncCrittrProAfterRestore,
  syncCrittrProForPaywall,
} from "@/lib/iap/entitlementSync";
import { withTimeout } from "@/lib/iap/withTimeout";
import {
  trackBeginCheckout,
  trackCheckoutOutcome,
  trackPurchase,
  trackRestorePurchases,
} from "@/lib/analytics";
import { supabase } from "@/lib/supabase";
import { Platform } from "react-native";
import Purchases, {
  PACKAGE_TYPE,
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
  type SubscriptionOption,
} from "react-native-purchases";

export type ProBillingParam = "monthly" | "annual";

export type ProPurchaseResult = {
  customerInfo: CustomerInfo;
  productIdentifier: string;
  /** True if RC reports the user has the Crittr Pro entitlement after this call. */
  hasCrittrPro: boolean;
};

export type ProPurchaseError = {
  /** True when the user dismissed the StoreKit / Play Billing sheet. */
  userCancelled: boolean;
  /** How the caller should recover — see `PurchaseFailureKind`. */
  kind?: PurchaseFailureKind;
  /** RC error code when available (e.g. PURCHASE_INVALID_ERROR). */
  code?: string;
  message: string;
};

export class ProPurchaseException extends Error {
  readonly userCancelled: boolean;
  readonly kind: PurchaseFailureKind;
  readonly code?: string;

  constructor(err: ProPurchaseError) {
    super(err.message);
    this.name = "ProPurchaseException";
    this.userCancelled = err.userCancelled;
    this.kind = err.kind ?? (err.userCancelled ? "cancelled" : "failed");
    this.code = err.code;
  }
}

function toProPurchaseException(
  raw: unknown,
  fallbackMessage: string,
): ProPurchaseException {
  const mapped = mapPurchasesError(raw, fallbackMessage);
  return new ProPurchaseException({
    userCancelled: mapped.kind === "cancelled",
    kind: mapped.kind,
    code: mapped.code,
    message: mapped.message,
  });
}

function billingLabelForPackage(pkg: PurchasesPackage): string {
  if (pkg.packageType === PACKAGE_TYPE.ANNUAL) return "annual";
  if (pkg.packageType === PACKAGE_TYPE.MONTHLY) return "monthly";
  return "unknown";
}

function commercialFromPackage(pkg: PurchasesPackage): {
  value: number;
  currency: string;
  itemId: string;
  billing: string;
} {
  return {
    value: typeof pkg.product.price === "number" ? pkg.product.price : 0,
    currency: pkg.product.currencyCode || "USD",
    itemId: pkg.product.identifier,
    billing: billingLabelForPackage(pkg),
  };
}

export type OfferingFetchFailure =
  /** RevenueCat SDK was never configured (missing public API key in build). */
  | "rc_not_configured"
  /** SDK call threw — usually store agreements / banking / product approval. */
  | "get_offerings_failed"
  /** The device or account can't purchase at all (Play BILLING_UNAVAILABLE). */
  | "billing_unavailable"
  /** Offerings loaded but none flagged as "current" / default in the RC dashboard. */
  | "no_current_offering"
  /** Current offering exists but the requested package (monthly/annual) is missing. */
  | "package_missing";

export type OfferingFetchResult =
  | { ok: true; package: PurchasesPackage }
  | { ok: false; reason: OfferingFetchFailure; detail?: string };

async function loadCurrentOffering(): Promise<
  | { ok: true; offering: PurchasesOffering }
  | { ok: false; reason: OfferingFetchFailure; detail?: string }
> {
  await configureRevenueCat();
  if (!isRevenueCatConfigured()) {
    return {
      ok: false,
      reason: "rc_not_configured",
      detail: "Missing EXPO_PUBLIC_REVENUECAT_API_KEY in this build.",
    };
  }
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) {
      return {
        ok: false,
        reason: "no_current_offering",
        detail: `RevenueCat returned no current offering. Available: ${
          Object.keys(offerings.all).join(", ") || "(none)"
        }`,
      };
    }
    if (__DEV__) {
      console.log(
        "[iapCheckout] current offering",
        current.identifier,
        current.availablePackages?.map((p) => ({
          package: p.identifier,
          type: p.packageType,
          product: p.product.identifier,
          defaultOption: p.product.defaultOption?.id ?? null,
          options:
            p.product.subscriptionOptions?.map((o) => ({
              id: o.id,
              storeProductId: o.storeProductId,
              isBasePlan: o.isBasePlan,
            })) ?? null,
        })),
      );
    }
    return { ok: true, offering: current };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[iapCheckout] getOfferings failed", msg);
    /**
     * Google Play reports "no products" and "this device can't buy anything"
     * through the same failed catalog fetch, so ask the store which one it is
     * before we pick the message the user reads.
     */
    if (!(await canMakeStorePayments())) {
      return { ok: false, reason: "billing_unavailable", detail: msg };
    }
    return { ok: false, reason: "get_offerings_failed", detail: msg };
  }
}

/**
 * Play Billing 5 products are `subscriptionId:basePlanId`
 * (`crittr_pro_monthly:monthly`). App Store products are the bare id.
 * Prefer the Play-shaped SKU on Android so we never submit an iOS product
 * id to Google Play (that surfaces as ITEM_UNAVAILABLE).
 */
function packageMatchesBilling(
  pkg: PurchasesPackage,
  billing: ProBillingParam,
): boolean {
  const productId = pkg.product.identifier.toLowerCase();
  const expectedType =
    billing === "annual" ? PACKAGE_TYPE.ANNUAL : PACKAGE_TYPE.MONTHLY;
  if (pkg.packageType === expectedType) return true;
  if (billing === "annual") {
    return (
      productId.includes("annual") ||
      productId.includes("year") ||
      productId.endsWith(":annual")
    );
  }
  return (
    productId.includes("monthly") ||
    productId.includes(":month") ||
    productId.endsWith(":monthly")
  );
}

function isPlayBasePlanProductId(productId: string): boolean {
  return productId.includes(":");
}

function selectPackageForBilling(
  offering: PurchasesOffering,
  billing: ProBillingParam,
): PurchasesPackage | null {
  const typed = billing === "annual" ? offering.annual : offering.monthly;
  const candidates = (offering.availablePackages ?? []).filter((pkg) =>
    packageMatchesBilling(pkg, billing),
  );

  if (Platform.OS === "android") {
    const playShaped =
      candidates.find((pkg) =>
        isPlayBasePlanProductId(pkg.product.identifier),
      ) ??
      (typed && isPlayBasePlanProductId(typed.product.identifier)
        ? typed
        : null);
    if (playShaped) return playShaped;
  }

  return typed ?? candidates[0] ?? null;
}

function playSubscriptionOption(
  pkg: PurchasesPackage,
): SubscriptionOption | null {
  const product = pkg.product;
  if (product.defaultOption) return product.defaultOption;
  const options = product.subscriptionOptions ?? [];
  /**
   * Prefer the paid base plan over a leftover intro offer. Play's
   * `defaultOption` already encodes eligibility; if it's missing, never
   * submit a free-phase option that a returning Google account can't use.
   */
  return (
    options.find((option) => option.isBasePlan && !option.freePhase) ??
    options.find((option) => !option.freePhase) ??
    options.find((option) => option.isBasePlan) ??
    options[0] ??
    null
  );
}

export async function fetchProPackageForBillingDetailed(
  billing: ProBillingParam,
): Promise<OfferingFetchResult> {
  const result = await loadCurrentOffering();
  if (!result.ok) return result;
  const pkg = selectPackageForBilling(result.offering, billing);
  if (!pkg) {
    const have =
      result.offering.availablePackages
        ?.map((p) => `${p.identifier}:${p.product.identifier}`)
        .join(", ") ?? "(none)";
    return {
      ok: false,
      reason: "package_missing",
      detail:
        `Offering "${result.offering.identifier}" has no ${billing} package. ` +
        `Available packages: ${have}.`,
    };
  }
  if (__DEV__) {
    console.log("[iapCheckout] selected package", {
      billing,
      package: pkg.identifier,
      product: pkg.product.identifier,
      defaultOption: pkg.product.defaultOption?.id ?? null,
    });
  }
  return { ok: true, package: pkg };
}

export async function fetchCurrentProPackages(): Promise<{
  monthly: PurchasesPackage | null;
  annual: PurchasesPackage | null;
}> {
  const result = await loadCurrentOffering();
  if (!result.ok) return { monthly: null, annual: null };
  return {
    monthly: selectPackageForBilling(result.offering, "monthly"),
    annual: selectPackageForBilling(result.offering, "annual"),
  };
}

export async function fetchProPackageForBilling(
  billing: ProBillingParam,
): Promise<PurchasesPackage | null> {
  const result = await fetchProPackageForBillingDetailed(billing);
  return result.ok ? result.package : null;
}

export function customerInfoHasCrittrPro(info: CustomerInfo): boolean {
  return rcCustomerInfoHasCrittrPro(info);
}

/** Don't block the paywall if identify / CustomerInfo fetch hangs. */
const DETECT_ENTITLEMENT_TIMEOUT_MS = 8_000;

/**
 * Cheap RC-only check used by the upgrade / checkout screens to short-circuit
 * the paywall when the signed-in user already has Crittr Pro in RevenueCat —
 * e.g. a promo code was redeemed in the App Store before sign-up completed,
 * or a previous session purchased and the Supabase profile hasn't caught up.
 *
 * Always identifies as the current Supabase user first. A raw
 * `getCustomerInfo()` against the anonymous SDK identity can report Pro from
 * device receipts that do not belong to this account, which used to trap the
 * paywall on "Activating Crittr Pro…".
 *
 * Returns `hasCrittrPro: false` when RC isn't configured, the SDK fails, or
 * the lookup times out so callers fall back to the regular paywall.
 */
export async function detectExistingCrittrProEntitlement(): Promise<
  | { hasCrittrPro: true; customerInfo: CustomerInfo }
  | { hasCrittrPro: false; customerInfo: CustomerInfo | null }
> {
  const user = await lookupAuthUser();
  if (!user) return { hasCrittrPro: false, customerInfo: null };

  const info = await withTimeout(
    getIdentifiedRevenueCatCustomerInfo(user.id),
    DETECT_ENTITLEMENT_TIMEOUT_MS,
  );
  if (!info) return { hasCrittrPro: false, customerInfo: null };
  return {
    hasCrittrPro: customerInfoHasCrittrPro(info),
    customerInfo: info,
  };
}

/**
 * Fires the platform purchase sheet for the chosen package. Returns the new
 * CustomerInfo from RC; throws `ProPurchaseException` on cancel / error so the
 * caller can react accordingly.
 */
export async function purchaseProPackage(
  pkg: PurchasesPackage,
): Promise<ProPurchaseResult> {
  const user = await lookupAuthUser();
  if (!user) {
    throw new ProPurchaseException({
      userCancelled: false,
      message: "Sign in to complete your purchase.",
    });
  }

  await configureRevenueCat();
  /**
   * Ensure the StoreKit transaction is tied to this Supabase user before the
   * sheet completes. Without this, RC may still be anonymous and the backend
   * GET /subscribers/{supabaseUserId} can miss the new purchase (common with
   * Xcode StoreKit Configuration + async auth RC login).
   *
   * Identity changes and the purchase itself run in one native queue below.
   */
  if (!isRevenueCatConfigured()) {
    throw new ProPurchaseException({
      userCancelled: false,
      message:
        "Subscriptions aren't available in this build. Check your RevenueCat API key.",
    });
  }
  const commercial = commercialFromPackage(pkg);
  trackBeginCheckout(commercial);
  try {
    /**
     * Play Billing 5 needs a base-plan SubscriptionOption
     * (`crittr_pro_monthly:monthly`). `purchasePackage` can still work, but if
     * the package's store product is the bare iOS id it fails with
     * ITEM_UNAVAILABLE. Prefer the option when the SDK attached one.
     */
    const playOption =
      Platform.OS === "android" ? playSubscriptionOption(pkg) : null;
    if (__DEV__) {
      console.log("[iapCheckout] purchasing", {
        product: pkg.product.identifier,
        option: playOption?.id ?? null,
        storeProductId: playOption?.storeProductId ?? null,
      });
    }
    const result = await withRevenueCatUser(user.id, () =>
      playOption
        ? Purchases.purchaseSubscriptionOption(playOption)
        : Purchases.purchasePackage(pkg),
    );
    ingestRevenueCatCustomerInfo(result.customerInfo);
    trackPurchase({
      ...commercial,
      transactionId: result.productIdentifier,
    });
    return {
      customerInfo: result.customerInfo,
      productIdentifier: result.productIdentifier,
      hasCrittrPro: customerInfoHasCrittrPro(result.customerInfo),
    };
  } catch (raw) {
    const err = toProPurchaseException(raw, "Purchase could not be completed.");
    const outcome =
      err.kind === "cancelled"
        ? "cancelled"
        : err.kind === "pending"
          ? "pending"
          : err.kind === "already_owned"
            ? "already_owned"
            : "failed";
    trackCheckoutOutcome({
      outcome,
      billing: commercial.billing,
      itemId: commercial.itemId,
    });
    throw err;
  }
}

/**
 * Restores prior in-app purchases via the active store account. Apple requires
 * this entry point on every paywall and inside subscription management, and it
 * is the recovery path on Play after a reinstall or account switch.
 */
export async function restoreProPurchases(): Promise<ProPurchaseResult> {
  const user = await lookupAuthUser();
  if (!user) {
    throw new ProPurchaseException({
      userCancelled: false,
      message: "Sign in to restore purchases.",
    });
  }

  await configureRevenueCat();
  if (!isRevenueCatConfigured()) {
    throw new ProPurchaseException({
      userCancelled: false,
      message:
        "Subscriptions aren't available in this build. Check your RevenueCat API key.",
    });
  }
  try {
    const customerInfo = await withRevenueCatUser(user.id, () =>
      Purchases.restorePurchases(),
    );
    ingestRevenueCatCustomerInfo(customerInfo);
    const unlocked = customerInfoHasCrittrPro(customerInfo);
    trackRestorePurchases(unlocked);
    return {
      customerInfo,
      productIdentifier: "",
      hasCrittrPro: unlocked,
    };
  } catch (raw) {
    throw toProPurchaseException(raw, "We couldn't restore your purchases.");
  }
}

const AUTH_LOOKUP_TIMEOUT_MS = 5_000;

const ACTIVATION_SYNC_ERROR =
  "Your purchase succeeded but Pro status hasn't synced yet. You won't be charged again. Retry activation, or go to the dashboard — Crittr Pro will unlock as soon as it syncs.";

/** Confirm the server projection after purchase/restore before unlocking any paid route.
 * Retry transient reconciliation contention within one bounded activation budget.
 */
export async function waitForProActivation(options?: {
  purchaseCustomerInfo?: CustomerInfo;
  source?: ProActivationSource;
}): Promise<void> {
  const generation = sessionGeneration(),
    deadline = Date.now() + 45000;
  const remaining = () => Math.max(1, deadline - Date.now());
  const user = await withTimeout(lookupAuthUser(), remaining());
  if (!user || generation !== sessionGeneration())
    throw new Error(ACTIVATION_SYNC_ERROR);
  let nextSyncAt = 0;
  while (Date.now() < deadline) {
    if (Date.now() >= nextSyncAt) {
      await withTimeout(
        runEntitlementSync(user.id, options?.source ?? "purchase"),
        remaining(),
      );
      nextSyncAt = Date.now() + 5000;
    }
    if (generation !== sessionGeneration())
      throw new Error("Your account changed. Sign in to check your purchase.");
    const response = await withTimeout(
      Promise.resolve(
        supabase.from("profiles").select("*").eq("id", user.id).single(),
      ),
      remaining(),
    );
    if (!response) break;
    const { data, error } = response;
    if (generation !== sessionGeneration())
      throw new Error("Your account changed");
    if (error) throw error;
    if (data) {
      ingestProfileMirror(data);
      queryClient.setQueryData(profileQueryKey(user.id), data);
      if (isCrittrProFromProfile(data)) return;
    }
    await sleep(Math.min(1000, remaining()));
  }
  throw new Error(ACTIVATION_SYNC_ERROR);
}

async function runEntitlementSync(
  userId: string,
  source: ProActivationSource,
): Promise<void> {
  if (source === "restore") await syncCrittrProAfterRestore(userId);
  else if (source === "paywall") await syncCrittrProForPaywall();
  else await syncCrittrProAfterCheckout();
}

async function lookupAuthUser(): Promise<{ id: string } | null> {
  const result = await withTimeout(
    supabase.auth.getUser(),
    AUTH_LOOKUP_TIMEOUT_MS,
  );
  return result?.data.user ?? null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
