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

export type RcNonSubscription = Pick<
  RcSubscription,
  | "store"
  | "is_sandbox"
  | "refunded_at"
  | "store_transaction_id"
  | "ownership_type"
> & { purchase_date?: string };

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
  purchase_date?: string | null;
  product_plan_identifier?: string | null;
  ownership_type?: string | null;
  period_type?: string | null;
};

export type RcSubscriberPayload = {
  subscriber: {
    original_app_user_id: string;
    subscriptions: Record<string, RcSubscription> | null;
    entitlements: Record<string, RcEntitlement> | null;
    non_subscriptions?: Record<string, RcNonSubscription[]> | null;
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
  isSandbox?: boolean;
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
  options: { allowSandbox?: boolean } = {},
): EntitlementVerdict {
  if (
    !payload?.subscriber ||
    !Object.prototype.hasOwnProperty.call(payload.subscriber, "entitlements")
  )
    return { kind: "unknown" };
  const entitlements = payload.subscriber.entitlements;
  if (
    entitlements !== null &&
    (typeof entitlements !== "object" || Array.isArray(entitlements))
  )
    return { kind: "unknown" };
  const candidates = [CRITTR_PRO_ENTITLEMENT, CRITTR_PRO_ENTITLEMENT_LEGACY]
    .filter(
      (id) =>
        entitlements && Object.prototype.hasOwnProperty.call(entitlements, id),
    )
    .map((id) => evaluateCandidate(payload, entitlements![id], now, options));
  const active = candidates
    .filter(
      (v): v is Extract<EntitlementVerdict, { kind: "active" }> =>
        v.kind === "active",
    )
    .sort((a, b) => {
      const end = (v: typeof a) =>
        v.summary.expiresAt === null
          ? Infinity
          : Date.parse(v.summary.expiresAt);
      return end(a) === end(b) ? 0 : end(a) > end(b) ? -1 : 1;
    });
  return (
    active[0] ??
    (candidates.some((v) => v.kind === "unknown")
      ? { kind: "unknown" }
      : { kind: "confirmed_inactive" })
  );
}

function evaluateCandidate(
  payload: RcSubscriberPayload,
  ent: RcEntitlement | null | undefined,
  now: number,
  options: { allowSandbox?: boolean },
): EntitlementVerdict {
  if (
    !ent ||
    typeof ent.product_identifier !== "string" ||
    !ent.product_identifier ||
    (ent.expires_date !== null &&
      (typeof ent.expires_date !== "string" ||
        !Number.isFinite(Date.parse(ent.expires_date))))
  )
    return { kind: "unknown" };
  const subs = payload.subscriber.subscriptions ?? {};
  const sub =
    subs[ent.product_identifier] ??
    Object.entries(subs)
      .filter(
        ([id]) => baseProductId(id) === baseProductId(ent.product_identifier),
      )
      .sort(([, a], [, b]) => {
        // Play can retain old base plans alongside the plan supplying access.
        const matches = (s: RcSubscription) =>
          Number(s.purchase_date === ent.purchase_date) +
          Number(s.expires_date === ent.expires_date);
        return (
          matches(b) - matches(a) ||
          Date.parse(b.purchase_date ?? b.expires_date ?? "") -
            Date.parse(a.purchase_date ?? a.expires_date ?? "")
        );
      })[0]?.[1];
  const purchase = (
    payload.subscriber.non_subscriptions?.[ent.product_identifier] ?? []
  )
    .filter((item) => !item.refunded_at)
    .sort(
      (a, b) =>
        Date.parse(b.purchase_date ?? "") - Date.parse(a.purchase_date ?? ""),
    )[0];
  const transaction = sub ?? purchase;
  const store =
    transaction?.store ??
    (ent.product_identifier.startsWith("rc_promo_") ? "promotional" : null);
  // Promotional grants are production access even on a sandbox test device.
  const isSandbox = store !== "promotional" && transaction?.is_sandbox === true;
  if (
    sub?.refunded_at ||
    (store !== null &&
      !["app_store", "play_store", "promotional"].includes(store)) ||
    (isSandbox && options.allowSandbox === false)
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
    ent.expires_date === null
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
      store,
      willRenew: Boolean(
        sub &&
        expiresAt !== null &&
        store !== "promotional" &&
        sub.period_type?.toLowerCase() !== "prepaid" &&
        sub.unsubscribe_detected_at == null &&
        sub.billing_issues_detected_at == null,
      ),
      originalPurchaseId:
        transaction?.store_transaction_id == null
          ? null
          : String(transaction.store_transaction_id),
      ownershipType: ent.ownership_type ?? transaction?.ownership_type ?? null,
      isSandbox,
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
