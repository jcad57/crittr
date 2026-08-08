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
 *
 * Safety properties
 * -----------------
 *   1. **Confirmed downgrades only.** A reconcile only treats the user as
 *      having lost Pro when RevenueCat *explicitly* reports an expired
 *      entitlement / subscription (or a 404 on the subscriber id we have
 *      cached on the profile). A transient REST error, or a 200 without a
 *      subscriber payload (`null` body), leaves `crittr_pro_until` untouched.
 *      This stops `applyCrittrProDowngradeCleanup` from firing on a flaky
 *      webhook event and accidentally archiving pets the user actively owns.
 *
 *   2. **Promo + re-upgrade auto-restore.** Whenever the reconcile sees the
 *      user is currently Pro, `restorePetsArchivedDuringDowngrade` runs so
 *      pets that were soft-archived during a previous downgrade come back.
 *
 *   3. **Idempotent profile updates.** When nothing changed (same
 *      `crittr_pro_until`, same store, etc.) we skip the UPDATE so we don't
 *      churn `updated_at` and trigger downstream listeners pointlessly.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

import {
  applyCrittrProDowngradeCleanup,
  restorePetsArchivedDuringDowngrade,
} from "./crittrProDowngradeCleanup.ts";

export const CRITTR_PRO_ENTITLEMENT = "crittr_pro";

/** Legacy mis-label; keep until all RC projects use identifier `crittr_pro`. */
const CRITTR_PRO_ENTITLEMENT_LEGACY = "Crittr Pro";

/**
 * Products that unlock Crittr Pro (must match App Store Connect + Play Console
 * + RevenueCat). Used when `subscriber.entitlements` is briefly stale after
 * purchase but `subscriber.subscriptions` already lists the active sub.
 *
 * Compared against the *base* product id: Google Play subscriptions bought
 * through Billing Library 5+ are reported as `subscriptionId:basePlanId`
 * (e.g. `crittr_pro_annual:annual`), while App Store products are bare.
 */
const KNOWN_CRITTR_PRO_PRODUCT_IDS = new Set([
  "crittr_pro_monthly",
  "crittr_pro_annual",
]);

/** Clock skew / RC propagation slack when comparing expiration to "now". */
const EXPIRATION_SLACK_MS = 120_000;

const RC_BASE = "https://api.revenuecat.com/v1";

/** Strips the Google Play `:basePlanId` suffix; no-op for App Store ids. */
function baseProductId(productId: string): string {
  const separator = productId.indexOf(":");
  return separator === -1 ? productId : productId.slice(0, separator);
}

function isKnownCrittrProProduct(productId: string): boolean {
  return KNOWN_CRITTR_PRO_PRODUCT_IDS.has(
    baseProductId(productId).toLowerCase(),
  );
}

/**
 * The entitlement's `product_identifier` and the `subscriptions` map keys
 * don't always agree on whether the Play base plan is included, so fall back
 * to matching on the subscription id alone.
 */
function findSubscriptionForProduct(
  subs: Record<string, RcSubscription>,
  productId: string,
): RcSubscription | null {
  if (subs[productId]) return subs[productId];
  const lower = productId.toLowerCase();
  for (const [k, v] of Object.entries(subs)) {
    if (k.toLowerCase() === lower) return v;
  }
  const base = baseProductId(lower);
  for (const [k, v] of Object.entries(subs)) {
    if (baseProductId(k.toLowerCase()) === base) return v;
  }
  return null;
}

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

function pickActiveEntitlement(payload: RcSubscriberPayload): {
  ent: RcEntitlement;
  sub: RcSubscription | null;
} | null {
  const ents = payload.subscriber.entitlements ?? {};
  const ent =
    ents[CRITTR_PRO_ENTITLEMENT] ?? ents[CRITTR_PRO_ENTITLEMENT_LEGACY] ?? null;
  if (!ent) return null;

  const subs = payload.subscriber.subscriptions ?? {};
  const sub = findSubscriptionForProduct(subs, ent.product_identifier);

  const expiresIso = ent.expires_date ?? sub?.expires_date ?? null;
  const grace = ent.grace_period_expires_date ?? null;
  const candidate = grace ?? expiresIso;
  if (!candidate) return null;

  const candidateMs = Date.parse(candidate);
  if (
    !Number.isFinite(candidateMs) ||
    candidateMs < Date.now() - EXPIRATION_SLACK_MS
  ) {
    return null;
  }

  return { ent, sub };
}

/**
 * When entitlements lag behind subscriptions right after a purchase, RC may list
 * the subscription with a future `expires_date` before `entitlements.crittr_pro` is populated.
 */
function summarizeFromKnownSubscriptionProducts(
  payload: RcSubscriberPayload,
): EntitlementSummary | null {
  const subs = payload.subscriber.subscriptions ?? {};
  let best: {
    expMs: number;
    productId: string;
    sub: RcSubscription;
  } | null = null;

  for (const [productId, sub] of Object.entries(subs)) {
    if (!isKnownCrittrProProduct(productId)) continue;
    const expStr = sub.expires_date;
    if (!expStr) continue;
    const expMs = Date.parse(expStr);
    if (!Number.isFinite(expMs)) continue;
    if (expMs < Date.now() - EXPIRATION_SLACK_MS) continue;
    if (!best || expMs > best.expMs) {
      best = { expMs, productId, sub };
    }
  }

  if (!best) return null;

  const sub = best.sub;
  const willRenew =
    sub.unsubscribe_detected_at == null &&
    sub.billing_issues_detected_at == null;

  return {
    crittrProUntil: sub.expires_date!,
    productIdentifier: best.productId,
    store: sub.store ?? null,
    willRenew,
    originalPurchaseId: sub.product_plan_identifier ?? best.productId,
  };
}

/** Result of summarising an RC subscriber payload. */
type EntitlementVerdict =
  | { kind: "active"; summary: EntitlementSummary }
  /**
   * RC explicitly reports no current entitlement / subscription. This is the
   * only signal that should trigger the downgrade cleanup branch when the
   * user was previously Pro.
   */
  | { kind: "confirmed_inactive" }
  /**
   * RC didn't tell us anything useful (no entitlement and no recognised
   * subscription product). Treat as "unknown" — leave existing state alone.
   */
  | { kind: "unknown" };

export function evaluateEntitlement(
  payload: RcSubscriberPayload,
): EntitlementVerdict {
  const active = pickActiveEntitlement(payload);
  if (active) {
    const { ent, sub } = active;
    const expires =
      ent.grace_period_expires_date ??
      ent.expires_date ??
      sub?.expires_date ??
      null;
    const willRenew =
      sub?.unsubscribe_detected_at == null &&
      sub?.billing_issues_detected_at == null
        ? true
        : false;

    return {
      kind: "active",
      summary: {
        crittrProUntil: expires,
        productIdentifier: ent.product_identifier,
        store: sub?.store ?? null,
        willRenew,
        originalPurchaseId:
          sub?.product_plan_identifier ?? ent.product_identifier ?? null,
      },
    };
  }

  const fromProducts = summarizeFromKnownSubscriptionProducts(payload);
  if (fromProducts) {
    return { kind: "active", summary: fromProducts };
  }

  // No live entitlement and no recognised live subscription. Inspect whether
  // RC has any prior crittr_pro_* subscription so we can distinguish
  // "definitely not Pro" from "user we know nothing about".
  const subs = payload.subscriber.subscriptions ?? {};
  const knownPriorSub = Object.entries(subs).some(([productId, sub]) => {
    if (!isKnownCrittrProProduct(productId)) return false;
    // Any expired-but-known sub counts as "we have seen this user own Pro".
    return Boolean(sub.expires_date);
  });
  if (knownPriorSub) return { kind: "confirmed_inactive" };

  const ents = payload.subscriber.entitlements ?? {};
  const knownPriorEntitlement =
    CRITTR_PRO_ENTITLEMENT in ents || CRITTR_PRO_ENTITLEMENT_LEGACY in ents;
  if (knownPriorEntitlement) return { kind: "confirmed_inactive" };

  return { kind: "unknown" };
}

/** Back-compat: callers that only need the summary still get the simple shape. */
export function summarizeEntitlement(
  payload: RcSubscriberPayload,
): EntitlementSummary {
  const verdict = evaluateEntitlement(payload);
  if (verdict.kind === "active") return verdict.summary;
  return {
    crittrProUntil: null,
    productIdentifier: null,
    store: null,
    willRenew: null,
    originalPurchaseId: null,
  };
}

export type ReconcileCrittrProOptions = {
  /** Poll RevenueCat REST; results often lag StoreKit / SDK after purchase. */
  subscriberSync?: { maxAttempts: number; delayMs: number };
  /** Try multiple subscriber ids (e.g. current vs `originalAppUserId` from merge). */
  alternateAppUserIds?: string[];
};

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function uniqueStrings(ids: (string | undefined | null)[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (typeof id !== "string" || id.length === 0) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * Reconcile the user's Crittr Pro entitlement with RevenueCat.
 *
 * Decision tree:
 *   - At least one tried app_user_id returned "active" entitlement →
 *     write the active summary and restore any soft-archived pets.
 *   - All tried ids returned "confirmed_inactive" → write nulls. If the
 *     profile was previously Pro, run the (now non-destructive) downgrade
 *     cleanup. Otherwise no-op.
 *   - At least one id returned "unknown" (404 with no aliases, transient
 *     REST issue, RC briefly empty) → leave the profile alone. The next
 *     webhook event / client-side sync will reconcile.
 *
 * `appUserId` defaults to the supabase user id, matching what the client
 * passes to `Purchases.logIn` on the device.
 */
export async function reconcileCrittrProForUser(
  admin: SupabaseClient,
  userId: string,
  appUserId?: string,
  options?: ReconcileCrittrProOptions,
): Promise<{ before: string | null; after: string | null }> {
  const primary = appUserId ?? userId;
  const rcIds = uniqueStrings([
    primary,
    ...(options?.alternateAppUserIds ?? []),
  ]);

  const maxAttempts = options?.subscriberSync?.maxAttempts ?? 1;
  const pollDelayMs = options?.subscriberSync?.delayMs ?? 2_000;

  const { data: profile } = await admin
    .from("profiles")
    .select(
      "id, crittr_pro_until, revenuecat_app_user_id, subscription_store, subscription_will_renew, original_purchase_id",
    )
    .eq("id", userId)
    .maybeSingle();

  const before = profile?.crittr_pro_until ?? null;
  const wasPro = before != null && Date.parse(before) > Date.now();

  let activeSummary: EntitlementSummary | null = null;
  let sawConfirmedInactive = false;
  let resolvedRcAppUserId: string | null = null;

  outer: for (const rcId of rcIds) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const payload = await fetchRevenueCatSubscriber(rcId);
        const verdict = evaluateEntitlement(payload);
        if (verdict.kind === "active") {
          activeSummary = verdict.summary;
          resolvedRcAppUserId = rcId;
          break outer;
        }
        if (verdict.kind === "confirmed_inactive") {
          sawConfirmedInactive = true;
          resolvedRcAppUserId = rcId;
          // Keep polling — the user may have just renewed and RC could
          // surface the new sub in a later attempt.
          if (attempt < maxAttempts - 1) await delay(pollDelayMs);
          continue;
        }
        // verdict.kind === "unknown" → keep trying this id then the next.
        if (attempt < maxAttempts - 1) await delay(pollDelayMs);
      } catch (e) {
        if (e instanceof RevenueCatRestError && e.status === 404) {
          // 404 is RC's way of saying "no such subscriber". Treat as
          // confirmed inactive only when we're certain we don't have other
          // app_user_ids to try.
          sawConfirmedInactive = true;
          continue;
        }
        // Network blips, 5xx, etc. — bail this id, leave state alone if
        // no other id resolves.
        if (Deno?.env?.get?.("DEBUG_RC_RECONCILE") === "1") {
          console.warn("[reconcileCrittrProForUser]", rcId, e);
        }
        break;
      }
    }
  }

  if (activeSummary) {
    const rcCol = resolvedRcAppUserId ?? primary;
    const updates: Record<string, unknown> = {
      crittr_pro_until: activeSummary.crittrProUntil,
      subscription_store: activeSummary.store,
      subscription_will_renew: activeSummary.willRenew,
      original_purchase_id: activeSummary.originalPurchaseId,
      revenuecat_app_user_id: rcCol,
    };

    const isStateUnchanged =
      (profile?.crittr_pro_until ?? null) ===
        (activeSummary.crittrProUntil ?? null) &&
      (profile?.revenuecat_app_user_id ?? null) === rcCol &&
      (profile?.subscription_store ?? null) === (activeSummary.store ?? null) &&
      (profile?.subscription_will_renew ?? null) ===
        (activeSummary.willRenew ?? null) &&
      (profile?.original_purchase_id ?? null) ===
        (activeSummary.originalPurchaseId ?? null);

    if (!isStateUnchanged) {
      const { error: upErr } = await admin
        .from("profiles")
        .update(updates)
        .eq("id", userId);
      if (upErr) throw upErr;
    }

    // Restore any pets that were soft-archived during a previous downgrade.
    // Idempotent — no-op when no rows carry the `pro_downgrade` flag.
    try {
      await restorePetsArchivedDuringDowngrade(admin, userId);
    } catch (e) {
      console.warn(
        "[reconcileCrittrProForUser] restorePetsArchivedDuringDowngrade failed:",
        e,
      );
    }

    return { before, after: activeSummary.crittrProUntil };
  }

  if (sawConfirmedInactive) {
    // Write nulls only when we are sure RC says "no Pro on file" for this
    // user. Otherwise we'd risk turning Pro off because a single REST call
    // was slow/flaky.
    const rcCol = resolvedRcAppUserId ?? primary;
    const updates: Record<string, unknown> = {
      crittr_pro_until: null,
      subscription_store: null,
      subscription_will_renew: null,
      original_purchase_id: null,
      revenuecat_app_user_id: rcCol,
    };

    const { error: upErr } = await admin
      .from("profiles")
      .update(updates)
      .eq("id", userId);
    if (upErr) throw upErr;

    if (wasPro) {
      try {
        await applyCrittrProDowngradeCleanup(admin, userId);
      } catch (e) {
        console.warn(
          "[reconcileCrittrProForUser] downgrade cleanup failed:",
          e,
        );
      }
    }

    return { before, after: null };
  }

  // Unknown — leave the profile in its current state.
  return { before, after: before };
}
