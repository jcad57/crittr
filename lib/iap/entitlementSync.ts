import { supabase } from "@/lib/supabase";

export type CrittrProEntitlementSyncResult = "synced" | "skipped" | "failed";

let inFlight: Promise<CrittrProEntitlementSyncResult> | null = null;

/**
 * Asks the Supabase `sync-crittr-pro-entitlement` Edge Function to reconcile
 * `profiles.crittr_pro_until` with whatever RevenueCat currently reports for
 * this user. Used as a fallback for the RC webhook (which is the primary path)
 * when the client wants a synchronous activation after a purchase, or after a
 * fresh login on a new device.
 *
 * Concurrent callers share a single in-flight request so cold start +
 * INITIAL_SESSION do not double-hit the function.
 */
async function requestEntitlementSync(
  body: Record<string, unknown>,
): Promise<CrittrProEntitlementSyncResult> {
  const { error } = await supabase.functions.invoke(
    "sync-crittr-pro-entitlement",
    { body, timeout: 25_000 },
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

export function ensureCrittrProSyncedFromRevenueCat(): Promise<CrittrProEntitlementSyncResult> {
  if (!inFlight) {
    inFlight = requestEntitlementSync({}).finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

/**
 * After a successful `Purchases.purchasePackage` we ask the backend to
 * re-pull RevenueCat for this user immediately so the UI can flip to Pro
 * without waiting for the webhook to fire.
 */
export function syncCrittrProAfterCheckout(): Promise<CrittrProEntitlementSyncResult> {
  return requestEntitlementSync({ source: "checkout" });
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
