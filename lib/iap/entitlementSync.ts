import { isRevenueCatConfigured, loginRevenueCatUser } from "@/lib/iap/revenueCat";
import { supabase } from "@/lib/supabase";
import Purchases from "react-native-purchases";

export type CrittrProEntitlementSyncResult = "synced" | "skipped" | "failed";

/**
 * Asks the Supabase `sync-crittr-pro-entitlement` Edge Function to reconcile
 * `profiles.crittr_pro_until` with whatever RevenueCat currently reports for
 * this user. Used as a fallback for the RC webhook (which is the primary path)
 * when the client wants a synchronous activation after a purchase, or after a
 * fresh login on a new device.
 */
async function requestEntitlementSync(
  body: Record<string, unknown>,
): Promise<CrittrProEntitlementSyncResult> {
  const longPoll =
    body.source === "checkout" || body.source === "session";
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

/**
 * Call after Supabase session is known: log into RevenueCat with the same user id,
 * then reconcile using the **SDK's** current `appUserID` (may differ from the
 * auth uuid briefly, or match an Apple-ID–scoped subscriber after restore).
 * Without `appUserId`, the Edge Function only GETs `/subscribers/{auth_uuid}` and
 * can miss entitlements still keyed under another RC id → `crittr_pro_until` stays null
 * while Apple/RC show active.
 */
export async function syncCrittrProForSession(
  userId: string,
): Promise<CrittrProEntitlementSyncResult> {
  await loginRevenueCatUser(userId);
  const rcAppUserId = await getRevenueCatAppUserIdForSync();
  const alternates: string[] = [];
  if (isRevenueCatConfigured()) {
    try {
      const info = await Purchases.getCustomerInfo();
      if (
        info.originalAppUserId &&
        info.originalAppUserId !== rcAppUserId
      ) {
        alternates.push(info.originalAppUserId);
      }
    } catch {
      /* ignore */
    }
  }
  const body: Record<string, unknown> = { source: "session" };
  if (typeof rcAppUserId === "string" && rcAppUserId.length > 0) {
    body.appUserId = rcAppUserId;
  }
  if (alternates.length > 0) body.alternateAppUserIds = alternates;
  return requestEntitlementSync(body);
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
  const body: Record<string, unknown> = { source: "checkout" };
  if (typeof revenueCatAppUserId === "string" && revenueCatAppUserId.length > 0) {
    body.appUserId = revenueCatAppUserId;
  }
  if (alternateAppUserIds && alternateAppUserIds.length > 0) {
    body.alternateAppUserIds = alternateAppUserIds;
  }
  return requestEntitlementSync(body);
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
