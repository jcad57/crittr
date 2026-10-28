import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

import {
  evaluateEntitlement,
  type RcSubscriberPayload,
} from "./evaluateCrittrProEntitlement.ts";
export {
  evaluateEntitlement,
  summarizeEntitlement,
  CRITTR_PRO_ENTITLEMENT,
} from "./evaluateCrittrProEntitlement.ts";
export type { RcSubscriberPayload } from "./evaluateCrittrProEntitlement.ts";
type EntitlementSummary = {
  isActive: boolean;
  crittrProUntil: string | null;
  productIdentifier: string | null;
  store: string | null;
  environment: string | null;
  willRenew: boolean | null;
  originalPurchaseId: string | null;
  ownershipType: string | null;
};
const empty = (): EntitlementSummary => ({
  isActive: false,
  crittrProUntil: null,
  productIdentifier: null,
  store: null,
  environment: null,
  willRenew: null,
  originalPurchaseId: null,
  ownershipType: null,
});
function summarizeTrusted(
  payload: RcSubscriberPayload,
  allowSandbox: boolean,
): EntitlementSummary {
  const verdict = evaluateEntitlement(payload, Date.now(), { allowSandbox });
  if (verdict.kind === "unknown")
    throw new Error("Invalid RevenueCat response");
  if (verdict.kind !== "active") return empty();
  const summary = verdict.summary;
  return {
    isActive: true,
    crittrProUntil: summary.expiresAt,
    productIdentifier: summary.productIdentifier,
    store: summary.store,
    environment: summary.isSandbox
      ? "sandbox"
      : summary.store === "promotional"
        ? "promotional"
        : "production",
    willRenew: summary.willRenew,
    originalPurchaseId: summary.originalPurchaseId,
    ownershipType: summary.ownershipType,
  };
}
export class RevenueCatRestError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`RevenueCat REST ${status}`);
  }
}
export class ReconciliationBusyError extends Error {}

export async function fetchRevenueCatSubscriber(
  appUserId: string,
): Promise<RcSubscriberPayload> {
  const key = Deno.env.get("REVENUECAT_SECRET_API_KEY");
  if (!key) throw new Error("RevenueCat secret is not configured");
  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
    {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok)
    throw new RevenueCatRestError(response.status, await response.text());
  const payload = await response.json();
  if (
    !payload?.subscriber ||
    typeof payload.subscriber !== "object" ||
    !Object.prototype.hasOwnProperty.call(payload.subscriber, "entitlements")
  ) {
    throw new Error("Invalid RevenueCat subscriber response");
  }
  return payload;
}

export async function reconcileCrittrProForUser(
  admin: SupabaseClient,
  userId: string,
  options: { checkout?: boolean; webhook?: boolean } = {},
): Promise<{ before: string | null; after: string | null }> {
  // Never consume client-supplied app user IDs or the legacy, potentially poisoned mapping.
  const { data: fence, error: lockError } = await admin.rpc(
    "begin_billing_reconciliation",
    {
      target: userId,
      minimum_interval: options.webhook ? 0 : options.checkout ? 2 : 5,
    },
  );
  if (lockError) throw lockError;
  if (!fence)
    throw new ReconciliationBusyError("Reconciliation already in progress");
  try {
    const [
      { data: profile, error: profileError },
      { data: tester, error: testerError },
    ] = await Promise.all([
      admin
        .from("profiles")
        .select("crittr_pro_until")
        .eq("id", userId)
        .single(),
      admin
        .from("billing_test_accounts")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    if (profileError) throw profileError;
    if (testerError) throw testerError;
    let summary = empty();
    const attempts = options.checkout ? 4 : 1;
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        summary = summarizeTrusted(
          await fetchRevenueCatSubscriber(userId),
          Boolean(tester),
        );
      } catch (error) {
        if (!(error instanceof RevenueCatRestError && error.status === 404))
          throw error;
        summary = empty();
      }
      if (summary.isActive || attempt === attempts - 1) break;
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
    const { data: committed, error } = await admin.rpc(
      "commit_billing_reconciliation",
      {
        target: userId,
        fence,
        snapshot: summary,
      },
    );
    if (error) throw error;
    if (!committed)
      throw new ReconciliationBusyError("Reconciliation superseded");
    // Access policies enforce expiry immediately. Downgrade never destroys user data.
    return { before: profile.crittr_pro_until, after: summary.crittrProUntil };
  } finally {
    const { error } = await admin.rpc("release_billing_reconciliation", {
      target: userId,
      fence,
    });
    if (error) console.error("[billing] lease release failed");
  }
}
