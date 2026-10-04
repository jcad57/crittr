/**
 * Pure RevenueCat REST subscriber → Crittr Pro entitlement evaluation.
 *
 * No Deno / Supabase imports so this can be unit-tested from Node.
 *
 * ACTIVE and EXPIRATION are independent:
 *   - Lifetime / dashboard grants: isActive=true, expiresAt=null
 *   - Canceled but not expired:    isActive=true, expiresAt=future, willRenew=false
 *   - Expired:                     isActive=false
 */

export const CRITTR_PRO_ENTITLEMENT = "crittr_pro";

/** Legacy mis-label; keep until all RC projects use identifier `crittr_pro`. */
export const CRITTR_PRO_ENTITLEMENT_LEGACY = "Crittr Pro";

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

/** Strips the Google Play `:basePlanId` suffix; no-op for App Store ids. */
export function baseProductId(productId: string): string {
  const separator = productId.indexOf(":");
  return separator === -1 ? productId : productId.slice(0, separator);
}

function isKnownCrittrProProduct(productId: string): boolean {
  return KNOWN_CRITTR_PRO_PRODUCT_IDS.has(
    baseProductId(productId).toLowerCase(),
  );
}

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

export type RcEntitlement = {
  expires_date: string | null;
  product_identifier: string;
  purchase_date: string;
  grace_period_expires_date?: string | null;
  ownership_type?: string | null;
};

export type RcSubscription = {
  expires_date: string | null;
  store: string;
  is_sandbox?: boolean;
  unsubscribe_detected_at?: string | null;
  billing_issues_detected_at?: string | null;
  original_purchase_date?: string | null;
  product_plan_identifier?: string | null;
  ownership_type?: string | null;
};

export type RcSubscriberPayload = {
  subscriber: {
    original_app_user_id: string;
    subscriptions: Record<string, RcSubscription> | null;
    entitlements: Record<string, RcEntitlement> | null;
  };
};

export type EntitlementSummary = {
  isActive: boolean;
  /** ISO when Pro access ends; `null` = lifetime / no expiration. */
  expiresAt: string | null;
  productIdentifier: string | null;
  store: string | null;
  willRenew: boolean | null;
  originalPurchaseId: string | null;
  ownershipType: string | null;
};

function willRenewFromSubscription(sub: RcSubscription | null): boolean {
  if (!sub) return false;
  return (
    sub.unsubscribe_detected_at == null && sub.billing_issues_detected_at == null
  );
}

/**
 * An entitlement with a missing expiration is lifetime (still active).
 * An entitlement with a past expiration is inactive.
 */
export function isExpirationCurrentlyValid(
  expiresIso: string | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (expiresIso == null || expiresIso === "") return true;
  const candidateMs = Date.parse(expiresIso);
  if (!Number.isFinite(candidateMs)) return false;
  return candidateMs >= nowMs - EXPIRATION_SLACK_MS;
}

function pickCrittrProEntitlement(
  payload: RcSubscriberPayload,
): { ent: RcEntitlement; sub: RcSubscription | null } | null {
  const ents = payload.subscriber.entitlements ?? {};
  const ent =
    ents[CRITTR_PRO_ENTITLEMENT] ?? ents[CRITTR_PRO_ENTITLEMENT_LEGACY] ?? null;
  if (!ent) return null;
  const subs = payload.subscriber.subscriptions ?? {};
  const sub = findSubscriptionForProduct(subs, ent.product_identifier);
  return { ent, sub };
}

function effectiveExpiration(
  ent: RcEntitlement,
  sub: RcSubscription | null,
): string | null {
  return ent.grace_period_expires_date ?? ent.expires_date ?? sub?.expires_date ??
    null;
}

function summaryFromEntitlement(
  ent: RcEntitlement,
  sub: RcSubscription | null,
): EntitlementSummary {
  const expiresAt = effectiveExpiration(ent, sub);
  return {
    isActive: true,
    expiresAt,
    productIdentifier: ent.product_identifier,
    store: sub?.store ?? null,
    willRenew: willRenewFromSubscription(sub),
    originalPurchaseId:
      sub?.product_plan_identifier ?? ent.product_identifier ?? null,
    ownershipType: ent.ownership_type ?? sub?.ownership_type ?? null,
  };
}

/**
 * When entitlements lag behind subscriptions right after a purchase, RC may list
 * the subscription with a future `expires_date` before `entitlements.crittr_pro`
 * is populated.
 */
function summarizeFromKnownSubscriptionProducts(
  payload: RcSubscriberPayload,
  nowMs: number,
): EntitlementSummary | null {
  const subs = payload.subscriber.subscriptions ?? {};
  let best: {
    expMs: number | null;
    productId: string;
    sub: RcSubscription;
  } | null = null;

  for (const [productId, sub] of Object.entries(subs)) {
    if (!isKnownCrittrProProduct(productId)) continue;
    const expStr = sub.expires_date;
    if (expStr == null || expStr === "") {
      // Lifetime product mapped onto a known id.
      if (!best || best.expMs != null) {
        best = { expMs: null, productId, sub };
      }
      continue;
    }
    const expMs = Date.parse(expStr);
    if (!Number.isFinite(expMs)) continue;
    if (expMs < nowMs - EXPIRATION_SLACK_MS) continue;
    if (!best || (best.expMs != null && expMs > best.expMs)) {
      best = { expMs, productId, sub };
    }
  }

  if (!best) return null;

  return {
    isActive: true,
    expiresAt: best.sub.expires_date,
    productIdentifier: best.productId,
    store: best.sub.store ?? null,
    willRenew: willRenewFromSubscription(best.sub),
    originalPurchaseId: best.sub.product_plan_identifier ?? best.productId,
    ownershipType: best.sub.ownership_type ?? null,
  };
}

/** Result of summarising an RC subscriber payload. */
export type EntitlementVerdict =
  | { kind: "active"; summary: EntitlementSummary }
  /**
   * RC explicitly reports no current entitlement / subscription. This is the
   * only signal that should trigger the downgrade cleanup branch when the
   * user was previously Pro.
   */
  | { kind: "confirmed_inactive" }
  /**
   * RC didn't tell us anything useful (missing subscriber object). Treat as
   * "unknown" — leave existing state alone.
   */
  | { kind: "unknown" };

export function evaluateEntitlement(
  payload: RcSubscriberPayload | null | undefined,
  nowMs: number = Date.now(),
): EntitlementVerdict {
  if (!payload?.subscriber) return { kind: "unknown" };

  const picked = pickCrittrProEntitlement(payload);
  if (picked) {
    const expiresAt = effectiveExpiration(picked.ent, picked.sub);
    if (isExpirationCurrentlyValid(expiresAt, nowMs)) {
      return {
        kind: "active",
        summary: summaryFromEntitlement(picked.ent, picked.sub),
      };
    }
  }

  const fromProducts = summarizeFromKnownSubscriptionProducts(payload, nowMs);
  if (fromProducts) {
    return { kind: "active", summary: fromProducts };
  }

  const subs = payload.subscriber.subscriptions ?? {};
  const knownPriorSub = Object.entries(subs).some(([productId, sub]) => {
    if (!isKnownCrittrProProduct(productId)) return false;
    return Boolean(sub.expires_date) || sub.store != null;
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
  nowMs: number = Date.now(),
): EntitlementSummary {
  const verdict = evaluateEntitlement(payload, nowMs);
  if (verdict.kind === "active") return verdict.summary;
  return {
    isActive: false,
    expiresAt: null,
    productIdentifier: null,
    store: null,
    willRenew: null,
    originalPurchaseId: null,
    ownershipType: null,
  };
}

export function inactiveEntitlementSummary(): EntitlementSummary {
  return {
    isActive: false,
    expiresAt: null,
    productIdentifier: null,
    store: null,
    willRenew: null,
    originalPurchaseId: null,
    ownershipType: null,
  };
}
