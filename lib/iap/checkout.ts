import { CRITTR_PRO_ENTITLEMENT } from "@/constants/iap";
import { isCrittrProFromProfile } from "@/lib/crittrPro";
import {
  configureRevenueCat,
  isRevenueCatConfigured,
} from "@/lib/iap/revenueCat";
import { syncCrittrProAfterCheckout } from "@/lib/iap/entitlementSync";
import { supabase } from "@/lib/supabase";
import Purchases, {
  type CustomerInfo,
  type PurchasesError,
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
  /** RC error code when available (e.g. PURCHASE_INVALID_ERROR). */
  code?: string;
  message: string;
};

export class ProPurchaseException extends Error {
  readonly userCancelled: boolean;
  readonly code?: string;

  constructor(err: ProPurchaseError) {
    super(err.message);
    this.name = "ProPurchaseException";
    this.userCancelled = err.userCancelled;
    this.code = err.code;
  }
}

async function loadCurrentOffering(): Promise<PurchasesOffering | null> {
  await configureRevenueCat();
  if (!isRevenueCatConfigured()) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch (e) {
    if (__DEV__) console.warn("[iapCheckout] getOfferings failed", e);
    return null;
  }
}

export async function fetchCurrentProPackages(): Promise<{
  monthly: PurchasesPackage | null;
  annual: PurchasesPackage | null;
}> {
  const offering = await loadCurrentOffering();
  if (!offering) return { monthly: null, annual: null };
  return {
    monthly: offering.monthly ?? null,
    annual: offering.annual ?? null,
  };
}

export async function fetchProPackageForBilling(
  billing: ProBillingParam,
): Promise<PurchasesPackage | null> {
  const { monthly, annual } = await fetchCurrentProPackages();
  return billing === "annual" ? annual : monthly;
}

export function customerInfoHasCrittrPro(info: CustomerInfo): boolean {
  return Boolean(info.entitlements.active[CRITTR_PRO_ENTITLEMENT]?.isActive);
}

/**
 * Fires the platform purchase sheet for the chosen package. Returns the new
 * CustomerInfo from RC; throws `ProPurchaseException` on cancel / error so the
 * caller can react accordingly.
 */
export async function purchaseProPackage(
  pkg: PurchasesPackage,
): Promise<ProPurchaseResult> {
  await configureRevenueCat();
  try {
    const result = await Purchases.purchasePackage(pkg);
    return {
      customerInfo: result.customerInfo,
      productIdentifier: result.productIdentifier,
      hasCrittrPro: customerInfoHasCrittrPro(result.customerInfo),
    };
  } catch (raw) {
    const err = raw as PurchasesError & {
      userCancelled?: boolean;
      message?: string;
      code?: string;
    };
    throw new ProPurchaseException({
      userCancelled: Boolean(err?.userCancelled),
      code: err?.code,
      message: err?.message ?? "Purchase could not be completed.",
    });
  }
}

/**
 * Restores prior in-app purchases via the active store account. Apple requires
 * this entry point on every paywall and inside subscription management.
 */
export async function restoreProPurchases(): Promise<ProPurchaseResult> {
  await configureRevenueCat();
  try {
    const customerInfo = await Purchases.restorePurchases();
    return {
      customerInfo,
      productIdentifier: "",
      hasCrittrPro: customerInfoHasCrittrPro(customerInfo),
    };
  } catch (raw) {
    const err = raw as PurchasesError & {
      userCancelled?: boolean;
      message?: string;
      code?: string;
    };
    throw new ProPurchaseException({
      userCancelled: Boolean(err?.userCancelled),
      code: err?.code,
      message: err?.message ?? "We couldn't restore your purchases.",
    });
  }
}

/**
 * After a purchase or restore, ask the backend to reconcile `crittr_pro_until`
 * from RevenueCat (so the rest of the app — gates, ads, AI, co-care — sees
 * Pro), then poll the profile until the column reflects active Pro.
 */
export async function waitForProActivation(maxWaitMs = 28_000): Promise<void> {
  const start = Date.now();
  const pollInterval = 500;
  let lastSync = 0;

  while (Date.now() - start < maxWaitMs) {
    if (await profileShowsActivePro()) return;

    const now = Date.now();
    if (now - lastSync >= 2_000) {
      lastSync = now;
      await syncCrittrProAfterCheckout();
    }
    await sleep(pollInterval);
  }

  await syncCrittrProAfterCheckout();
  if (await profileShowsActivePro()) return;

  throw new Error(
    "Your purchase succeeded but Pro status hasn't synced yet. Pull to refresh or reopen the app.",
  );
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
