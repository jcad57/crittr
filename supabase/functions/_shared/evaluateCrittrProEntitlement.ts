export const CRITTR_PRO_ENTITLEMENT = "crittr_pro";
export const CRITTR_PRO_ENTITLEMENT_LEGACY = "Crittr Pro";
export const baseProductId = (id: string) => id.split(":")[0];
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
  refunded_at?: string | null;
  grace_period_expires_date?: string | null;
  store_transaction_id?: string | number | null;
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

export const VERIFICATION_MAX_AGE_MS = 72 * 60 * 60 * 1000;
export function isExpirationCurrentlyValid(
  value: string | null | undefined,
  now = Date.now(),
): boolean {
  return (
    value === null ||
    (typeof value === "string" &&
      Number.isFinite(Date.parse(value)) &&
      Date.parse(value) > now)
  );
}
export type EntitlementVerdict =
  | { kind: "active"; summary: EntitlementSummary }
  | { kind: "confirmed_inactive" }
  | { kind: "unknown" };
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
export function evaluateEntitlement(
  payload: RcSubscriberPayload | null | undefined,
  now = Date.now(),
): EntitlementVerdict {
  if (
    !payload?.subscriber ||
    !Object.prototype.hasOwnProperty.call(payload.subscriber, "entitlements")
  )
    return { kind: "unknown" };
  const ent = payload.subscriber.entitlements?.[CRITTR_PRO_ENTITLEMENT];
  if (!ent || typeof ent.product_identifier !== "string")
    return { kind: "confirmed_inactive" };
  const subs = payload.subscriber.subscriptions ?? {};
  const sub =
    subs[ent.product_identifier] ??
    Object.entries(subs).find(
      ([id]) => baseProductId(id) === baseProductId(ent.product_identifier),
    )?.[1];
  if (
    sub?.refunded_at ||
    (sub && !["app_store", "play_store", "promotional"].includes(sub.store))
  )
    return { kind: "confirmed_inactive" };
  const dates = [
    ent.expires_date,
    ent.grace_period_expires_date,
    sub?.grace_period_expires_date,
  ].filter(
    (v): v is string => typeof v === "string" && Number.isFinite(Date.parse(v)),
  );
  const expiresAt =
    ent.expires_date === null && dates.length === 0
      ? null
      : dates.length
        ? new Date(Math.max(...dates.map(Date.parse))).toISOString()
        : undefined;
  if (!isExpirationCurrentlyValid(expiresAt, now))
    return { kind: "confirmed_inactive" };
  return {
    kind: "active",
    summary: {
      isActive: true,
      expiresAt: expiresAt ?? null,
      productIdentifier: ent.product_identifier,
      store: sub?.store ?? "promotional",
      willRenew: sub
        ? sub.unsubscribe_detected_at == null &&
          sub.billing_issues_detected_at == null
        : false,
      originalPurchaseId:
        sub?.store_transaction_id == null
          ? null
          : String(sub.store_transaction_id),
      ownershipType: ent.ownership_type ?? sub?.ownership_type ?? null,
    },
  };
}
export function summarizeEntitlement(
  payload: RcSubscriberPayload,
  now = Date.now(),
): EntitlementSummary {
  const verdict = evaluateEntitlement(payload, now);
  return verdict.kind === "active"
    ? verdict.summary
    : inactiveEntitlementSummary();
}
