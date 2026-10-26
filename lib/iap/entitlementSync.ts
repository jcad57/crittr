import {
  canMakeStorePayments,
  isRevenueCatConfigured,
  loginRevenueCatUser,
} from "@/lib/iap/revenueCat";
import { ingestRevenueCatCustomerInfo } from "@/lib/iap/crittrProClientState";
import { withTimeout } from "@/lib/iap/withTimeout";
import { supabase } from "@/lib/supabase";
import Purchases, { type CustomerInfo } from "react-native-purchases";

/** StoreKit / Play receipt pull can hang on some devices; fail open. */
const STORE_SYNC_TIMEOUT_MS = 8_000;

export type CrittrProEntitlementSyncResult = "synced" | "skipped" | "failed";

/**
 * Sources that the client can use to label a sync. The edge function uses the
 * source to pick how long it polls RevenueCat's REST API for a fresh
 * subscriber payload (promo redemptions / receipts can take 10-60s to surface
 * after a fresh purchase).
 *
 *  - `checkout`  — directly after `Purchases.purchasePackage` resolved.
 *  - `restore`   — after `Purchases.restorePurchases`.
 *  - `session`   — first sync after auth hydration (post sign-in / sign-up).
 *  - `app_launch`— cold start / foreground reconciliation pass.
 *  - `focus`     — routine refresh (subscriptions screen pull-to-refresh, etc.).
 *  - `cust_info` — fired by `addCustomerInfoUpdateListener` (live RC updates).
 *  - `paywall`   — upgrade-screen preflight when the SDK already reports Pro.
 */
export type CrittrProSyncSource =
  | "checkout"
  | "restore"
  | "session"
  | "app_launch"
  | "focus"
  | "cust_info"
  | "paywall";

const LONG_POLL_SOURCES: ReadonlySet<CrittrProSyncSource> = new Set([
  "checkout",
  "restore",
  "session",
  "app_launch",
]);

/**
 * Asks the Supabase `sync-crittr-pro-entitlement` Edge Function to reconcile
 * the `profiles` entitlement mirror with whatever RevenueCat currently reports
 * for this user. The webhook is the primary push path; this function is the
 * client-pull fallback used after purchases, restores, or fresh logins.
 */
function isAbortLike(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { name?: string; message?: string };
  if (e.name === "AbortError") return true;
  return typeof e.message === "string" && /abort|timed out|timeout/i.test(e.message);
}

/**
 * supabase-js v2 ignores a `timeout` option on `functions.invoke`. Abort the
 * fetch ourselves so a hung Edge Function cannot pin the UI on a spinner.
 * Background checkout sync still gets a generous budget; the activating
 * screen must not await this on the happy path.
 */
async function requestEntitlementSync(
  body: Record<string, unknown>,
): Promise<CrittrProEntitlementSyncResult> {
  const source = body.source as CrittrProSyncSource | undefined;
  const longPoll = source != null && LONG_POLL_SOURCES.has(source);
  const invokeTimeoutMs = longPoll ? 45_000 : 15_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), invokeTimeoutMs);
  try {
    const { error } = await supabase.functions.invoke(
      "sync-crittr-pro-entitlement",
      { body, signal: controller.signal },
    );

    if (!error) return "synced";
    if (isAbortLike(error)) return "failed";

    const parsed = await parseFunctionsErrorPayload(error);
    if (parsed?.error === "no_subscription") {
      return "skipped";
    }

    const msg = await extractInvokeErrorMessage(error, parsed);
    if (msg.includes("no_subscription")) return "skipped";

    if (__DEV__) {
      console.warn("[sync-crittr-pro-entitlement]", msg);
    }
    return "failed";
  } catch (e) {
    if (!isAbortLike(e) && __DEV__) {
      console.warn("[sync-crittr-pro-entitlement]", e);
    }
    return "failed";
  } finally {
    clearTimeout(timer);
  }
}

type RcSyncContext = {
  customerInfo: CustomerInfo | null;
  rcAppUserId: string | null;
  alternateAppUserIds: string[];
};

/**
 * Login RC (idempotent), refresh receipts from the storefront, and capture
 * the SDK's current `appUserID` plus any `originalAppUserId` aliases that
 * differ. Used by every long-poll source so the Edge Function can query the
 * subscriber under all of the user's known RC ids.
 */
async function prepareRcSyncContext(
  userId: string,
): Promise<RcSyncContext> {
  await withTimeout(loginRevenueCatUser(userId), STORE_SYNC_TIMEOUT_MS);

  let customerInfoAfterStoreSync: CustomerInfo | null = null;
  /**
   * Skip the storefront pull where the device can't transact at all (Android
   * emulators without Play services, no Google account, restricted profiles).
   * It can only fail there, and every failure is a noisy RevenueCat error log.
   */
  const canPay =
    (await withTimeout(canMakeStorePayments(), 3_000)) !== false;
  if (isRevenueCatConfigured() && canPay) {
    try {
        const synced = await withTimeout(
          Purchases.syncPurchasesForResult(),
          STORE_SYNC_TIMEOUT_MS,
        );
        if (synced) {
          customerInfoAfterStoreSync = synced.customerInfo;
          ingestRevenueCatCustomerInfo(synced.customerInfo);
        }
    } catch {
      /* offline / billing unavailable / hung store — continue with REST. */
    }
  }

  const rcAppUserId = await getRevenueCatAppUserIdForSync();
  const alternateAppUserIds: string[] = [];

  if (isRevenueCatConfigured()) {
    try {
      const info =
        customerInfoAfterStoreSync ??
        (await withTimeout(Purchases.getCustomerInfo(), STORE_SYNC_TIMEOUT_MS));
      if (info) {
        ingestRevenueCatCustomerInfo(info);
        if (
          info.originalAppUserId &&
          info.originalAppUserId !== rcAppUserId
        ) {
          alternateAppUserIds.push(info.originalAppUserId);
        }
      }
    } catch {
      /* ignore */
    }
  }

  return {
    customerInfo: customerInfoAfterStoreSync,
    rcAppUserId,
    alternateAppUserIds,
  };
}

function buildSyncBody(
  source: CrittrProSyncSource,
  ctx: { rcAppUserId: string | null; alternateAppUserIds: string[] },
): Record<string, unknown> {
  const body: Record<string, unknown> = { source };
  if (typeof ctx.rcAppUserId === "string" && ctx.rcAppUserId.length > 0) {
    body.appUserId = ctx.rcAppUserId;
  }
  if (ctx.alternateAppUserIds.length > 0) {
    body.alternateAppUserIds = ctx.alternateAppUserIds;
  }
  return body;
}

/**
 * First sync after Supabase auth hydration. Promo redemptions, family
 * sharing, web-redeemed offer codes, etc. all need the storefront pull +
 * long REST polling to land before the user sees the dashboard / paywall.
 */
export async function syncCrittrProForSession(
  userId: string,
): Promise<CrittrProEntitlementSyncResult> {
  const ctx = await prepareRcSyncContext(userId);
  return requestEntitlementSync(buildSyncBody("session", ctx));
}

/**
 * Foreground / cold-start reconciliation pass. Use the long-poll budget so a
 * recent promo redeemed while the app was closed actually arrives before the
 * user interacts with Pro-gated features.
 */
export async function syncCrittrProOnAppLaunch(
  userId: string,
): Promise<CrittrProEntitlementSyncResult> {
  const ctx = await prepareRcSyncContext(userId);
  return requestEntitlementSync(buildSyncBody("app_launch", ctx));
}

/** Current RevenueCat app user id from the SDK (matches Edge Function `appUserId` param). */
export async function getRevenueCatAppUserIdForSync(): Promise<string | null> {
  if (!isRevenueCatConfigured()) return null;
  try {
    const id = await withTimeout(Purchases.getAppUserID(), 3_000);
    return typeof id === "string" && id.length > 0 ? id : null;
  } catch {
    return null;
  }
}

/**
 * After a successful `Purchases.purchasePackage` we ask the backend to
 * re-pull RevenueCat for this user immediately so the UI can flip to Pro
 * without waiting for the webhook to fire.
 *
 * Pass `revenueCatAppUserId` from `Purchases.getAppUserID()` and optional
 * `alternateAppUserIds` (e.g. `customerInfo.originalAppUserId`) so the Edge
 * Function queries merged RevenueCat subscribers.
 */
export function syncCrittrProAfterCheckout(
  revenueCatAppUserId?: string | null,
  alternateAppUserIds?: string[],
): Promise<CrittrProEntitlementSyncResult> {
  return requestEntitlementSync(
    buildSyncBody("checkout", {
      rcAppUserId: revenueCatAppUserId ?? null,
      alternateAppUserIds: alternateAppUserIds ?? [],
    }),
  );
}

/**
 * After a Restore Purchases tap. Same shape as `syncCrittrProForSession` but
 * tagged so analytics / logging can tell the two apart.
 */
export async function syncCrittrProAfterRestore(
  userId: string,
): Promise<CrittrProEntitlementSyncResult> {
  const ctx = await prepareRcSyncContext(userId);
  return requestEntitlementSync(buildSyncBody("restore", ctx));
}

/**
 * Paywall-open preflight. The SDK already reported an active entitlement for
 * this identified user, so we only need the backend to copy that onto the
 * `profiles` entitlement mirror. No storefront pull (that path can hang) and no
 * long REST poll (if REST doesn't already know, the paywall stays up).
 */
export function syncCrittrProForPaywall(
  revenueCatAppUserId?: string | null,
  alternateAppUserIds?: string[],
): Promise<CrittrProEntitlementSyncResult> {
  return requestEntitlementSync(
    buildSyncBody("paywall", {
      rcAppUserId: revenueCatAppUserId ?? null,
      alternateAppUserIds: alternateAppUserIds ?? [],
    }),
  );
}

/**
 * Short-poll path used by `RevenueCatProSync` when RevenueCat tells us
 * CustomerInfo just changed (live update). We just want the backend to mirror
 * the latest state; if RC was busy, the next event re-fires anyway.
 */
export async function syncCrittrProFromCustomerInfo(
  userId: string,
): Promise<CrittrProEntitlementSyncResult> {
  // No store sync here — RC just pushed us CustomerInfo, so the storefront
  // is already up to date for this app session.
  const rcAppUserId = await getRevenueCatAppUserIdForSync();
  const alternateAppUserIds: string[] = [];
  if (isRevenueCatConfigured()) {
    try {
      const info = await withTimeout(Purchases.getCustomerInfo(), 4_000);
      if (info) {
        ingestRevenueCatCustomerInfo(info);
        if (
          info.originalAppUserId &&
          info.originalAppUserId !== rcAppUserId
        ) {
          alternateAppUserIds.push(info.originalAppUserId);
        }
      }
    } catch {
      /* ignore */
    }
  }
  return requestEntitlementSync(
    buildSyncBody("cust_info", { rcAppUserId, alternateAppUserIds }),
  );
}

async function parseFunctionsErrorPayload(
  error: unknown,
): Promise<Record<string, unknown> | null> {
  if (!error || typeof error !== "object") return null;
  const ctx = (error as { context?: unknown }).context;
  if (ctx instanceof Response) {
    try {
      return (await ctx.json()) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

async function extractInvokeErrorMessage(
  error: unknown,
  parsed: Record<string, unknown> | null,
): Promise<string> {
  if (parsed) {
    if (typeof parsed.message === "string") return parsed.message;
    if (typeof parsed.error === "string") return parsed.error;
  }
  if (error && typeof error === "object") {
    const e = error as { message?: string; context?: unknown };
    if (e.context instanceof Response) {
      try {
        const j = (await e.context.clone().json()) as Record<string, unknown>;
        if (typeof j.message === "string") return j.message;
        if (typeof j.error === "string") return j.error;
      } catch {
        /* ignore */
      }
    }
    if (typeof e.message === "string" && e.message.length > 0) {
      return e.message;
    }
  }
  return "";
}
