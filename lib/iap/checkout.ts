import { isCrittrProFromProfile } from "@/lib/crittrPro";
import {
  customerInfoHasCrittrPro as rcCustomerInfoHasCrittrPro,
} from "@/lib/iap/crittrProRevenueCat";
import {
  mapPurchasesError,
  type PurchaseFailureKind,
} from "@/lib/iap/purchaseErrors";
import {
  canMakeStorePayments,
  configureRevenueCat,
  getRevenueCatCustomerInfo,
  isRevenueCatConfigured,
  loginRevenueCatUser,
} from "@/lib/iap/revenueCat";
import {
  syncCrittrProAfterCheckout,
  syncCrittrProAfterRestore,
} from "@/lib/iap/entitlementSync";
import { supabase } from "@/lib/supabase";
import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
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

export async function fetchProPackageForBillingDetailed(
  billing: ProBillingParam,
): Promise<OfferingFetchResult> {
  const result = await loadCurrentOffering();
  if (!result.ok) return result;
  const pkg = billing === "annual"
    ? result.offering.annual
    : result.offering.monthly;
  if (!pkg) {
    const have =
      result.offering.availablePackages?.map((p) => p.identifier).join(", ") ??
        "(none)";
    return {
      ok: false,
      reason: "package_missing",
      detail:
        `Offering "${result.offering.identifier}" has no ${billing} package. ` +
        `Available packages: ${have}.`,
    };
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
    monthly: result.offering.monthly ?? null,
    annual: result.offering.annual ?? null,
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

/**
 * Cheap RC-only check used by the upgrade / checkout screens to short-circuit
 * the paywall when the user already has Pro on this device — e.g. a promo
 * code was redeemed in the App Store before sign-up completed, or a previous
 * session purchased and we're returning to the screen via deep link.
 *
 * Returns `null` when RC isn't configured / the SDK fails so callers fall
 * back to the regular flow.
 */
export async function detectExistingCrittrProEntitlement(): Promise<
  | { hasCrittrPro: true; customerInfo: CustomerInfo }
  | { hasCrittrPro: false; customerInfo: CustomerInfo | null }
> {
  const info = await getRevenueCatCustomerInfo();
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
   */
  await loginRevenueCatUser(user.id);
  if (!isRevenueCatConfigured()) {
    throw new ProPurchaseException({
      userCancelled: false,
      message:
        "Subscriptions aren't available in this build. Check your RevenueCat API key.",
    });
  }
  try {
    const result = await Purchases.purchasePackage(pkg);
    return {
      customerInfo: result.customerInfo,
      productIdentifier: result.productIdentifier,
      hasCrittrPro: customerInfoHasCrittrPro(result.customerInfo),
    };
  } catch (raw) {
    throw toProPurchaseException(raw, "Purchase could not be completed.");
  }
}

/**
 * Restores prior in-app purchases via the active store account. Apple requires
 * this entry point on every paywall and inside subscription management, and it
 * is the recovery path on Play after a reinstall or account switch.
 */
export async function restoreProPurchases(): Promise<ProPurchaseResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new ProPurchaseException({
      userCancelled: false,
      message: "Sign in to restore purchases.",
    });
  }

  await configureRevenueCat();
  await loginRevenueCatUser(user.id);
  if (!isRevenueCatConfigured()) {
    throw new ProPurchaseException({
      userCancelled: false,
      message:
        "Subscriptions aren't available in this build. Check your RevenueCat API key.",
    });
  }
  try {
    const customerInfo = await Purchases.restorePurchases();
    return {
      customerInfo,
      productIdentifier: "",
      hasCrittrPro: customerInfoHasCrittrPro(customerInfo),
    };
  } catch (raw) {
    throw toProPurchaseException(raw, "We couldn't restore your purchases.");
  }
}

/**
 * After a purchase or restore, ask the backend to reconcile `crittr_pro_until`
 * from RevenueCat (so the rest of the app — gates, ads, AI, co-care — sees
 * Pro), then poll the profile until the column reflects active Pro.
 *
 * `source` controls which entitlement-sync helper we call (purchase vs
 * restore vs whatever came from outside). Both helpers use the long-poll
 * patience budget in the edge function so promo / family-share propagation
 * lag is tolerated.
 *
 * The Edge Function polls RevenueCat REST internally (purchase propagation
 * lag). We avoid hammering it every 2s: one sync, fast profile poll,
 * optional second sync.
 */
export async function waitForProActivation(
  maxWaitMs = 75_000,
  options?: {
    purchaseCustomerInfo?: CustomerInfo;
    source?: "purchase" | "restore";
  },
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error(
      "Your purchase succeeded but Pro status hasn't synced yet. Pull to refresh or reopen the app.",
    );
  }

  await loginRevenueCatUser(user.id);

  if (isRevenueCatConfigured()) {
    try {
      await Purchases.invalidateCustomerInfoCache();
    } catch {
      /* best-effort: nudge RC backend before Edge GET */
    }
    try {
      await Purchases.getCustomerInfo();
    } catch {
      /* ignore */
    }
  }

  const source = options?.source ?? "purchase";
  const triggerSync = async (): Promise<void> => {
    if (source === "restore") {
      await syncCrittrProAfterRestore(user.id);
      return;
    }
    const rcId = await safeGetRevenueCatAppUserId();
    const alternates = alternateRcIdsForSync(
      options?.purchaseCustomerInfo,
      rcId,
    );
    await syncCrittrProAfterCheckout(rcId, alternates);
  };

  await triggerSync();
  if (await profileShowsActivePro()) return;

  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    if (await profileShowsActivePro()) return;
    await sleep(350);
  }

  if (isRevenueCatConfigured()) {
    try {
      await Purchases.getCustomerInfo();
    } catch {
      /* ignore */
    }
  }

  await triggerSync();
  if (await profileShowsActivePro()) return;

  throw new Error(
    "Your purchase succeeded but Pro status hasn't synced yet. Pull to refresh or reopen the app.",
  );
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
    return await Purchases.getAppUserID();
  } catch (e) {
    if (__DEV__) console.warn("[iapCheckout] getAppUserID failed", e);
    return null;
  }
}

async function profileShowsActivePro(): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("profiles")
    .select("crittr_pro_until")
    .eq("id", user.id)
    .maybeSingle();
  return isCrittrProFromProfile(data);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
