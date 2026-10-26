/**
 * Source-of-truth entitlement helper for Crittr Pro.
 *
 * Calls the RevenueCat REST API for a given `app_user_id` and mirrors the
 * current `crittr_pro` entitlement onto `profiles` (`crittr_pro_active` plus
 * expiration / store metadata).
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
 *      subscriber payload (`null` body), leaves the mirror untouched.
 *      This stops `applyCrittrProDowngradeCleanup` from firing on a flaky
 *      webhook event and accidentally archiving pets the user actively owns.
 *      Cancellation (`willRenew=false`) and lifetime grants (`expiresAt=null`)
 *      are never treated as inactive.
 *
 *   2. **Promo + re-upgrade auto-restore.** Whenever the reconcile sees the
 *      user is currently Pro, `restorePetsArchivedDuringDowngrade` runs so
 *      pets that were soft-archived during a previous downgrade come back.
 *
 *   3. **Idempotent profile updates.** When nothing changed we skip the UPDATE
 *      so we don't churn `updated_at` and trigger downstream listeners.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

import {
  applyCrittrProDowngradeCleanup,
  restorePetsArchivedDuringDowngrade,
} from "./crittrProDowngradeCleanup.ts";
import {
  CRITTR_PRO_ENTITLEMENT,
  evaluateEntitlement,
  type EntitlementSummary,
  type RcSubscriberPayload,
  summarizeEntitlement,
} from "./evaluateCrittrProEntitlement.ts";

export {
  CRITTR_PRO_ENTITLEMENT,
  evaluateEntitlement,
  summarizeEntitlement,
};
export type { EntitlementSummary, RcSubscriberPayload };

const RC_BASE = "https://api.revenuecat.com/v1";

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

export type ReconcileCrittrProOptions = {
  /** Poll RevenueCat REST; results often lag StoreKit / SDK after purchase. */
  subscriberSync?: { maxAttempts: number; delayMs: number };
  /** Try multiple subscriber ids (e.g. current vs `originalAppUserId` from merge). */
  alternateAppUserIds?: string[];
};

export type ReconcileCrittrProResult = {
  before: string | null;
  after: string | null;
  activeBefore: boolean;
  activeAfter: boolean;
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

function profileIsProMirror(profile: {
  crittr_pro_active?: boolean | null;
  crittr_pro_until?: string | null;
} | null): boolean {
  if (!profile) return false;
  if (profile.crittr_pro_active === true) return true;
  if (profile.crittr_pro_active === false) return false;
  const until = profile.crittr_pro_until;
  if (until == null) return false;
  return Date.parse(until) > Date.now();
}

function logReconcile(
  phase: string,
  details: Record<string, unknown>,
): void {
  console.log("[crittr-pro]", phase, details);
}

/**
 * Reconcile the user's Crittr Pro entitlement with RevenueCat.
 *
 * Decision tree:
 *   - At least one tried app_user_id returned "active" entitlement →
 *     write the active summary (`crittr_pro_active=true`, preserve null
 *     expiration for lifetime) and restore any soft-archived pets.
 *   - All tried ids returned "confirmed_inactive" → write inactive. If the
 *     profile was previously Pro, run downgrade cleanup. Otherwise no-op.
 *   - At least one id returned "unknown" (including REST 404 — the
 *     subscriber may not exist yet after a fresh purchase — or a transient
 *     REST issue) → leave the profile alone. The next webhook event /
 *     client-side sync will reconcile.
 *
 * `appUserId` defaults to the supabase user id, matching what the client
 * passes to `Purchases.logIn` on the device.
 */
export async function reconcileCrittrProForUser(
  admin: SupabaseClient,
  userId: string,
  appUserId?: string,
  options?: ReconcileCrittrProOptions,
): Promise<ReconcileCrittrProResult> {
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
      "id, crittr_pro_active, crittr_pro_until, crittr_pro_product_id, crittr_pro_ownership_type, crittr_pro_last_synced_at, revenuecat_app_user_id, subscription_store, subscription_will_renew, original_purchase_id",
    )
    .eq("id", userId)
    .maybeSingle();

  const before = profile?.crittr_pro_until ?? null;
  const wasPro = profileIsProMirror(profile);

  let activeSummary: EntitlementSummary | null = null;
  let sawConfirmedInactive = false;
  let resolvedRcAppUserId: string | null = null;

  outer: for (const rcId of rcIds) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const rcPayload = await fetchRevenueCatSubscriber(rcId);
        const verdict = evaluateEntitlement(rcPayload);
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
          // 404 means this app user id is not in RevenueCat yet. After a
          // fresh StoreKit / Play purchase the REST subscriber routinely lags
          // the SDK — that is "unknown", not a confirmed lapse. Treating 404
          // as inactive used to write crittr_pro_active=false right after a
          // successful pay, which left the client polling a non-Pro profile.
          if (attempt < maxAttempts - 1) await delay(pollDelayMs);
          continue;
        }
        // Network blips, 5xx, etc. — bail this id, leave state alone if
        // no other id resolves.
        console.warn("[crittr-pro] RevenueCat REST failed; preserving mirror", {
          status: e instanceof RevenueCatRestError ? e.status : undefined,
        });
        break;
      }
    }
  }

  if (activeSummary) {
    const rcCol = resolvedRcAppUserId ?? primary;
    const nowIso = new Date().toISOString();
    const updates: Record<string, unknown> = {
      crittr_pro_active: true,
      crittr_pro_until: activeSummary.expiresAt,
      crittr_pro_product_id: activeSummary.productIdentifier,
      crittr_pro_ownership_type: activeSummary.ownershipType,
      crittr_pro_last_synced_at: nowIso,
      subscription_store: activeSummary.store,
      subscription_will_renew: activeSummary.willRenew,
      original_purchase_id: activeSummary.originalPurchaseId,
      revenuecat_app_user_id: rcCol,
    };

    const isStateUnchanged =
      profile?.crittr_pro_active === true &&
      (profile?.crittr_pro_until ?? null) ===
        (activeSummary.expiresAt ?? null) &&
      (profile?.revenuecat_app_user_id ?? null) === rcCol &&
      (profile?.subscription_store ?? null) === (activeSummary.store ?? null) &&
      (profile?.subscription_will_renew ?? null) ===
        (activeSummary.willRenew ?? null) &&
      (profile?.original_purchase_id ?? null) ===
        (activeSummary.originalPurchaseId ?? null) &&
      (profile?.crittr_pro_product_id ?? null) ===
        (activeSummary.productIdentifier ?? null) &&
      (profile?.crittr_pro_ownership_type ?? null) ===
        (activeSummary.ownershipType ?? null);

    if (!isStateUnchanged) {
      const { error: upErr } = await admin
        .from("profiles")
        .update(updates)
        .eq("id", userId);
      if (upErr) throw upErr;
    }

    logReconcile("rc → supabase mirror", {
      decision: "active",
      rcActive: true,
      expiresAt: activeSummary.expiresAt,
      willRenew: activeSummary.willRenew,
      store: activeSummary.store,
      ownershipType: activeSummary.ownershipType,
      supabaseActive: true,
    });

    try {
      await restorePetsArchivedDuringDowngrade(admin, userId);
    } catch (e) {
      console.warn(
        "[reconcileCrittrProForUser] restorePetsArchivedDuringDowngrade failed:",
        e,
      );
    }

    return {
      before,
      after: activeSummary.expiresAt,
      activeBefore: wasPro,
      activeAfter: true,
    };
  }

  if (sawConfirmedInactive) {
    const rcCol = resolvedRcAppUserId ?? primary;
    const nowIso = new Date().toISOString();
    const updates: Record<string, unknown> = {
      crittr_pro_active: false,
      crittr_pro_until: null,
      crittr_pro_product_id: null,
      crittr_pro_ownership_type: null,
      crittr_pro_last_synced_at: nowIso,
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

    logReconcile("rc → supabase mirror", {
      decision: "confirmed_inactive",
      rcActive: false,
      supabaseActive: false,
      downgradeCleanup: wasPro,
    });

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

    return {
      before,
      after: null,
      activeBefore: wasPro,
      activeAfter: false,
    };
  }

  logReconcile("rc → supabase mirror", {
    decision: "unknown_preserve",
    supabaseActive: wasPro,
    expiresAt: before,
  });

  return {
    before,
    after: before,
    activeBefore: wasPro,
    activeAfter: wasPro,
  };
}
