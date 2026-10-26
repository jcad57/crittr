import { isCrittrProFromProfile } from "@/lib/crittrPro";
import {
  clientHasUnlockedPro,
  ingestRevenueCatCustomerInfo,
} from "@/lib/iap/crittrProClientState";
import {
  resolveProActivationWaitMs,
  type ProActivationSource,
} from "@/lib/iap/proActivation";
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
  loginRevenueCatUser,
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
      candidates.find((pkg) => isPlayBasePlanProductId(pkg.product.identifier)) ??
      (typed && isPlayBasePlanProductId(typed.product.identifier) ? typed : null);
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
      result.offering.availablePackages?.map(
        (p) => `${p.identifier}:${p.product.identifier}`,
      ).join(", ") ?? "(none)";
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
   * Bound the wait so a hung logIn cannot prevent the payment sheet from
   * opening; the identify call continues in the background.
   */
  await withTimeout(loginRevenueCatUser(user.id), 8_000);
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
    const result = playOption
      ? await Purchases.purchaseSubscriptionOption(playOption)
      : await Purchases.purchasePackage(pkg);
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
  await withTimeout(loginRevenueCatUser(user.id), 8_000);
  if (!isRevenueCatConfigured()) {
    throw new ProPurchaseException({
      userCancelled: false,
      message:
        "Subscriptions aren't available in this build. Check your RevenueCat API key.",
    });
  }
  try {
    const customerInfo = await Purchases.restorePurchases();
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

const PROFILE_POLL_TIMEOUT_MS = 4_000;
const AUTH_LOOKUP_TIMEOUT_MS = 5_000;
const RC_REFRESH_TIMEOUT_MS = 4_000;

const ACTIVATION_SYNC_ERROR =
  "Your purchase succeeded but Pro status hasn't synced yet. You won't be charged again. Retry activation, or go to the dashboard — Crittr Pro will unlock as soon as it syncs.";

/**
 * Finish client-side Pro unlock after a store success.
 *
 * RevenueCat CustomerInfo is the client source of truth. When the SDK already
 * reports Crittr Pro we return immediately and reconcile the `profiles` mirror
 * in the background. Blocking the UI on that Edge Function is what left
 * TestFlight / production checkouts stuck on "Activating Crittr Pro…":
 * `functions.invoke` ignores `timeout`, REST can lag StoreKit, and iOS timers
 * can stall after the payment sheet.
 *
 * We only wait (briefly) when the store succeeded but the entitlement is not
 * in CustomerInfo yet (ask-to-buy, Play pending → owned, restore race).
 */
export async function waitForProActivation(options?: {
  purchaseCustomerInfo?: CustomerInfo;
  source?: ProActivationSource;
}): Promise<void> {
  if (options?.purchaseCustomerInfo) {
    ingestRevenueCatCustomerInfo(options.purchaseCustomerInfo);
  }

  const source = options?.source ?? "purchase";
  const revenueCatAlreadyHasPro =
    (options?.purchaseCustomerInfo != null &&
      customerInfoHasCrittrPro(options.purchaseCustomerInfo)) ||
    clientHasUnlockedPro();

  const waitMs = resolveProActivationWaitMs({
    source,
    revenueCatAlreadyHasPro,
  });

  const user = await lookupAuthUser();

  if (revenueCatAlreadyHasPro) {
    if (user) kickoffBackendEntitlementSync(user.id, source, options?.purchaseCustomerInfo);
    return;
  }

  if (!user) {
    throw new Error(ACTIVATION_SYNC_ERROR);
  }

  const deadline = Date.now() + waitMs;
  const remaining = () => Math.max(0, deadline - Date.now());

  await withTimeout(loginRevenueCatUser(user.id), Math.min(RC_REFRESH_TIMEOUT_MS, remaining()));
  if (clientHasUnlockedPro()) {
    kickoffBackendEntitlementSync(user.id, source, options?.purchaseCustomerInfo);
    return;
  }

  if (isRevenueCatConfigured() && remaining() > 400) {
    try {
      const info = await withTimeout(
        Purchases.getCustomerInfo(),
        Math.min(RC_REFRESH_TIMEOUT_MS, remaining()),
      );
      if (info) ingestRevenueCatCustomerInfo(info);
    } catch {
      /* ignore */
    }
    if (clientHasUnlockedPro()) {
      kickoffBackendEntitlementSync(user.id, source, options?.purchaseCustomerInfo);
      return;
    }
  }

  if (remaining() > 500) {
    await withTimeout(
      runEntitlementSync(user.id, source, options?.purchaseCustomerInfo),
      remaining(),
    );
    if (clientHasUnlockedPro() || (await profileShowsActivePro())) return;
  }

  while (remaining() > 0) {
    if (clientHasUnlockedPro() || (await profileShowsActivePro())) {
      kickoffBackendEntitlementSync(user.id, source, options?.purchaseCustomerInfo);
      return;
    }
    if (isRevenueCatConfigured() && remaining() > 400) {
      try {
        const info = await withTimeout(
          Purchases.getCustomerInfo(),
          Math.min(2_000, remaining()),
        );
        if (info) ingestRevenueCatCustomerInfo(info);
      } catch {
        /* ignore */
      }
      if (clientHasUnlockedPro()) {
        kickoffBackendEntitlementSync(user.id, source, options?.purchaseCustomerInfo);
        return;
      }
    }
    await sleep(Math.min(300, remaining()));
  }

  if (clientHasUnlockedPro() || (await profileShowsActivePro())) return;

  throw new Error(ACTIVATION_SYNC_ERROR);
}

function kickoffBackendEntitlementSync(
  userId: string,
  source: ProActivationSource,
  purchaseCustomerInfo?: CustomerInfo,
): void {
  void runEntitlementSync(userId, source, purchaseCustomerInfo).catch((e) => {
    if (__DEV__) console.warn("[iapCheckout] background entitlement sync failed", e);
  });
}

async function runEntitlementSync(
  userId: string,
  source: ProActivationSource,
  purchaseCustomerInfo?: CustomerInfo,
): Promise<void> {
  if (source === "restore") {
    await syncCrittrProAfterRestore(userId);
    return;
  }
  const rcId = await safeGetRevenueCatAppUserId();
  const alternates = alternateRcIdsForSync(purchaseCustomerInfo, rcId);
  if (source === "paywall") {
    await syncCrittrProForPaywall(rcId, alternates);
    return;
  }
  await syncCrittrProAfterCheckout(rcId, alternates);
}

async function lookupAuthUser(): Promise<{ id: string } | null> {
  const result = await withTimeout(supabase.auth.getUser(), AUTH_LOOKUP_TIMEOUT_MS);
  return result?.data.user ?? null;
}

function alternateRcIdsForSync(
  purchaseInfo: CustomerInfo | undefined,
  currentRcId: string | null,
): string[] {
  const oid = purchaseInfo?.originalAppUserId;
  if (!oid || !oid.length) return [];
  if (currentRcId && oid === currentRcId) return [];
  return [oid];
}

async function safeGetRevenueCatAppUserId(): Promise<string | null> {
  if (!isRevenueCatConfigured()) return null;
  try {
    const id = await withTimeout(Purchases.getAppUserID(), 3_000);
    return typeof id === "string" && id.length > 0 ? id : null;
  } catch (e) {
    if (__DEV__) console.warn("[iapCheckout] getAppUserID failed", e);
    return null;
  }
}

async function profileShowsActivePro(): Promise<boolean> {
  const flagged = await withTimeout(
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;
      const { data } = await supabase
        .from("profiles")
        .select("crittr_pro_active, crittr_pro_until")
        .eq("id", user.id)
        .maybeSingle();
      return isCrittrProFromProfile(data);
    })(),
    PROFILE_POLL_TIMEOUT_MS,
  );
  return flagged === true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
