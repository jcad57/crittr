import {
  canMakeStorePayments,
  isRevenueCatConfigured,
  loginRevenueCatUser,
} from "@/lib/iap/revenueCat";
import { supabase } from "@/lib/supabase";
import Purchases, { type CustomerInfo } from "react-native-purchases";

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
 */
export type CrittrProSyncSource =
  | "checkout"
  | "restore"
  | "session"
  | "app_launch"
  | "focus"
  | "cust_info";

const LONG_POLL_SOURCES: ReadonlySet<CrittrProSyncSource> = new Set([
  "checkout",
  "restore",
  "session",
  "app_launch",
]);

/**
 * Asks the Supabase `sync-crittr-pro-entitlement` Edge Function to reconcile
 * `profiles.crittr_pro_until` with whatever RevenueCat currently reports for
 * this user. The webhook is the primary push path; this function is the
 * client-pull fallback used after purchases, restores, or fresh logins.
 */
async function requestEntitlementSync(
  body: Record<string, unknown>,
): Promise<CrittrProEntitlementSyncResult> {
  const source = body.source as CrittrProSyncSource | undefined;
  const longPoll = source != null && LONG_POLL_SOURCES.has(source);
  const { error } = await supabase.functions.invoke(
    "sync-crittr-pro-entitlement",
    { body, timeout: longPoll ? 90_000 : 25_000 },
  );

  if (!error) return "synced";

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
  await loginRevenueCatUser(userId);

  let customerInfoAfterStoreSync: CustomerInfo | null = null;
  /**
   * Skip the storefront pull where the device can't transact at all (Android
   * emulators without Play services, no Google account, restricted profiles).
   * It can only fail there, and every failure is a noisy RevenueCat error log.
   */
  if (isRevenueCatConfigured() && (await canMakeStorePayments())) {
    try {
      const synced = await Purchases.syncPurchasesForResult();
      customerInfoAfterStoreSync = synced.customerInfo;
    } catch {
      /* offline / billing unavailable — continue with REST + cached CustomerInfo. */
    }
  }

  const rcAppUserId = await getRevenueCatAppUserIdForSync();
  const alternateAppUserIds: string[] = [];

  if (isRevenueCatConfigured()) {
    try {
      const info =
        customerInfoAfterStoreSync ?? (await Purchases.getCustomerInfo());
      if (
        info?.originalAppUserId &&
        info.originalAppUserId !== rcAppUserId
      ) {
        alternateAppUserIds.push(info.originalAppUserId);
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
    return await Purchases.getAppUserID();
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
      const info = await Purchases.getCustomerInfo();
      if (
        info?.originalAppUserId &&
        info.originalAppUserId !== rcAppUserId
      ) {
        alternateAppUserIds.push(info.originalAppUserId);
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
