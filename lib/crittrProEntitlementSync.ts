import { supabase } from "@/lib/supabase";

export type CrittrProEntitlementSyncResult = "synced" | "skipped" | "failed";

let inFlight: Promise<CrittrProEntitlementSyncResult> | null = null;

async function requestCrittrProEntitlementSync(
  body: Record<string, unknown>,
): Promise<CrittrProEntitlementSyncResult> {
  const { error } = await supabase.functions.invoke(
    "sync-crittr-pro-entitlement",
    { body, timeout: 25_000 },
  );

  if (!error) {
    return "synced";
  }

  const parsed = await parseFunctionsErrorPayload(error);
  if (parsed?.error === "no_subscription") {
    return "skipped";
  }

  const msg = await extractInvokeErrorMessage(error, parsed);
  if (
    msg.includes("no_subscription") ||
    msg.includes("No Stripe subscription")
  ) {
    return "skipped";
  }

  if (__DEV__) {
    console.warn("[sync-crittr-pro-entitlement]", msg);
  }
  return "failed";
}

/**
 * Reconciles `crittr_pro_until` with Stripe via Edge Function (webhook fallback).
 * Concurrent callers share one request so cold start + INITIAL_SESSION do not double-hit Stripe.
 */
export function ensureCrittrProSyncedFromStripe(): Promise<CrittrProEntitlementSyncResult> {
  if (!inFlight) {
    inFlight = requestCrittrProEntitlementSync({}).finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

/**
 * After PaymentSheet success: pass the subscription id from checkout so Supabase can sync
 * even if the Stripe webhook is delayed or metadata is missing.
 */
export function syncCrittrProAfterCheckout(
  subscriptionId?: string | null,
): Promise<CrittrProEntitlementSyncResult> {
  const sid = subscriptionId?.trim();
  return requestCrittrProEntitlementSync(
    sid ? { subscriptionId: sid } : {},
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
