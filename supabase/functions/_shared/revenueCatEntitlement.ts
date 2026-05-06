/**
 * Source-of-truth entitlement helper for Crittr Pro.
 *
 * Calls the RevenueCat REST API for a given `app_user_id` and computes
 * `profiles.crittr_pro_until` plus a few denormalized columns we keep in
 * `profiles` for fast display (`subscription_store`, `subscription_will_renew`,
 * `original_purchase_id`).
 *
 * Used by `revenuecat-webhook` (server push) and `sync-crittr-pro-entitlement`
 * (client pull) so both paths produce identical state.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

import { applyCrittrProDowngradeCleanup } from "./crittrProDowngradeCleanup.ts";

export const CRITTR_PRO_ENTITLEMENT = "crittr_pro";

const RC_BASE = "https://api.revenuecat.com/v1";

type RcEntitlement = {
  expires_date: string | null;
  product_identifier: string;
  purchase_date: string;
  /** Optional in some payloads; treat absence as no transaction yet. */
  grace_period_expires_date?: string | null;
};

type RcSubscription = {
  expires_date: string | null;
  store: string;
  is_sandbox?: boolean;
  unsubscribe_detected_at?: string | null;
  billing_issues_detected_at?: string | null;
  original_purchase_date?: string | null;
  /** RevenueCat exposes the receipt-level identifier on subscriber.subscriptions.<product>.original_purchase_date plus subscriber.original_app_user_id; we use the subscription key (product identifier) as a stable store reference. */
  product_plan_identifier?: string | null;
};

type RcSubscriberPayload = {
  subscriber: {
    original_app_user_id: string;
    subscriptions: Record<string, RcSubscription> | null;
    entitlements: Record<string, RcEntitlement> | null;
  };
};

export type EntitlementSummary = {
  /** ISO string when Pro access ends; null = no Pro. */
  crittrProUntil: string | null;
  /** Active product identifier when entitlement is active. */
  productIdentifier: string | null;
  /** Renewal store (`app_store`, `play_store`, `promotional`, ...). */
  store: string | null;
  /** True when auto-renew is on. False when user cancelled (still in paid period). */
  willRenew: boolean | null;
  /** Receipt-level identifier (best effort). */
  originalPurchaseId: string | null;
};

export class RevenueCatRestError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`RevenueCat REST ${status}: ${body.slice(0, 256)}`);
    this.status = status;
    this.body = body;
  }
}

function rcSecret(): string {
  const key = Deno.env.get("REVENUECAT_SECRET_API_KEY");
  if (!key) throw new Error("REVENUECAT_SECRET_API_KEY is not configured");
  return key;
}

export async function fetchRevenueCatSubscriber(
  appUserId: string,
): Promise<RcSubscriberPayload> {
  const url = `${RC_BASE}/subscribers/${encodeURIComponent(appUserId)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${rcSecret()}`,
      Accept: "application/json",
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new RevenueCatRestError(res.status, text);
  }
  return JSON.parse(text) as RcSubscriberPayload;
}

function pickActiveEntitlement(payload: RcSubscriberPayload):
  | {
      ent: RcEntitlement;
      sub: RcSubscription | null;
    }
  | null {
  const ent = payload.subscriber.entitlements?.[CRITTR_PRO_ENTITLEMENT];
  if (!ent) return null;

  const subs = payload.subscriber.subscriptions ?? {};
  const sub = subs[ent.product_identifier] ?? null;

  const expiresIso = ent.expires_date ?? sub?.expires_date ?? null;
  const grace = ent.grace_period_expires_date ?? null;
  const candidate = grace ?? expiresIso;
  if (!candidate) return null;

  const candidateMs = Date.parse(candidate);
  if (!Number.isFinite(candidateMs) || candidateMs < Date.now()) {
    return null;
  }

  return { ent, sub };
}

export function summarizeEntitlement(
  payload: RcSubscriberPayload,
): EntitlementSummary {
  const active = pickActiveEntitlement(payload);
  if (!active) {
    return {
      crittrProUntil: null,
      productIdentifier: null,
      store: null,
      willRenew: null,
      originalPurchaseId: null,
    };
  }
  const { ent, sub } = active;
  const expires =
    ent.grace_period_expires_date ?? ent.expires_date ?? sub?.expires_date ?? null;
  const willRenew =
    sub?.unsubscribe_detected_at == null && sub?.billing_issues_detected_at == null
      ? true
      : false;

  return {
    crittrProUntil: expires,
    productIdentifier: ent.product_identifier,
    store: sub?.store ?? null,
    willRenew,
    originalPurchaseId:
      sub?.product_plan_identifier ?? ent.product_identifier ?? null,
  };
}

/**
 * Reconcile the user's Crittr Pro entitlement with RevenueCat.
 * - When the entitlement has dropped (was active, now expired), runs the
 *   downgrade cleanup so free-tier rules apply.
 * - Updates `profiles` so display state matches RC.
 *
 * `appUserId` defaults to the supabase user id, matching what the client
 * passes to `Purchases.logIn` on the device.
 */
export async function reconcileCrittrProForUser(
  admin: SupabaseClient,
  userId: string,
  appUserId?: string,
): Promise<{ before: string | null; after: string | null }> {
  const id = appUserId ?? userId;

  const { data: profile } = await admin
    .from("profiles")
    .select(
      "id, crittr_pro_until, revenuecat_app_user_id, subscription_store, subscription_will_renew, original_purchase_id",
    )
    .eq("id", userId)
    .maybeSingle();

  const before = profile?.crittr_pro_until ?? null;
  const wasPro = before != null && Date.parse(before) > Date.now();

  let summary: EntitlementSummary;
  try {
    const payload = await fetchRevenueCatSubscriber(id);
    summary = summarizeEntitlement(payload);
  } catch (e) {
    if (e instanceof RevenueCatRestError && e.status === 404) {
      summary = {
        crittrProUntil: null,
        productIdentifier: null,
        store: null,
        willRenew: null,
        originalPurchaseId: null,
      };
    } else {
      throw e;
    }
  }

  const updates: Record<string, unknown> = {
    crittr_pro_until: summary.crittrProUntil,
    subscription_store: summary.store,
    subscription_will_renew: summary.willRenew,
    original_purchase_id: summary.originalPurchaseId,
    revenuecat_app_user_id: id,
  };

  const { error: upErr } = await admin
    .from("profiles")
    .update(updates)
    .eq("id", userId);
  if (upErr) throw upErr;

  const after = summary.crittrProUntil;
  const isPro = after != null && Date.parse(after) > Date.now();

  if (wasPro && !isPro) {
    try {
      await applyCrittrProDowngradeCleanup(admin, userId);
    } catch (e) {
      console.warn("[reconcileCrittrProForUser] cleanup failed:", e);
    }
  }

  return { before, after };
}
