import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  entitlementFromProfileMirror,
  isCrittrProEntitlementActive,
  isCrittrProFromProfile,
  resolveClientIsCrittrPro,
  type CrittrProEntitlement,
} from "./crittrPro.ts";

const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

function ent(
  partial: Partial<CrittrProEntitlement> & Pick<CrittrProEntitlement, "isActive">,
): CrittrProEntitlement {
  return {
    expiresAt: null,
    willRenew: null,
    store: null,
    productIdentifier: null,
    ownershipType: null,
    originalPurchaseDate: null,
    latestPurchaseDate: null,
    source: "revenuecat",
    lastSyncedAt: null,
    ...partial,
  };
}

describe("isCrittrProEntitlementActive", () => {
  it("treats active monthly / annual as Pro", () => {
    assert.equal(
      isCrittrProEntitlementActive(
        ent({ isActive: true, expiresAt: future, willRenew: true }),
      ),
      true,
    );
  });

  it("treats canceled-but-not-expired as Pro", () => {
    assert.equal(
      isCrittrProEntitlementActive(
        ent({ isActive: true, expiresAt: future, willRenew: false }),
      ),
      true,
    );
  });

  it("treats lifetime grants (null expiration) as Pro", () => {
    assert.equal(
      isCrittrProEntitlementActive(
        ent({ isActive: true, expiresAt: null, willRenew: false }),
      ),
      true,
    );
  });

  it("does not use a null expiration as inactive", () => {
    assert.equal(
      isCrittrProEntitlementActive(ent({ isActive: true, expiresAt: null })),
      true,
    );
  });

  it("treats expired subscriptions as not Pro", () => {
    assert.equal(
      isCrittrProEntitlementActive(
        ent({ isActive: false, expiresAt: past, willRenew: false }),
      ),
      false,
    );
  });

  it("ignores willRenew and productIdentifier as access signals", () => {
    assert.equal(
      isCrittrProEntitlementActive(
        ent({
          isActive: false,
          willRenew: true,
          productIdentifier: "crittr_pro_annual",
        }),
      ),
      false,
    );
  });
});

describe("isCrittrProFromProfile (Supabase mirror)", () => {
  it("uses crittr_pro_active as the access flag", () => {
    assert.equal(
      isCrittrProFromProfile({ crittr_pro_active: true, crittr_pro_until: null }),
      true,
    );
    assert.equal(
      isCrittrProFromProfile({
        crittr_pro_active: false,
        crittr_pro_until: future,
      }),
      false,
    );
  });

  it("allows lifetime: active + null expiration", () => {
    assert.equal(
      isCrittrProFromProfile({ crittr_pro_active: true, crittr_pro_until: null }),
      true,
    );
  });

  it("falls back to until > now when active is unset (legacy rows)", () => {
    assert.equal(
      isCrittrProFromProfile({
        crittr_pro_active: null,
        crittr_pro_until: future,
      }),
      true,
    );
    assert.equal(
      isCrittrProFromProfile({
        crittr_pro_active: undefined,
        crittr_pro_until: past,
      }),
      false,
    );
    assert.equal(
      isCrittrProFromProfile({
        crittr_pro_active: undefined,
        crittr_pro_until: null,
      }),
      false,
    );
  });
});

describe("resolveClientIsCrittrPro", () => {
  it("prefers CustomerInfo once observed", () => {
    assert.equal(
      resolveClientIsCrittrPro(
        true,
        ent({ isActive: true, expiresAt: null }),
        { crittr_pro_active: false, crittr_pro_until: null },
      ),
      true,
    );
    assert.equal(
      resolveClientIsCrittrPro(
        true,
        ent({ isActive: false }),
        { crittr_pro_active: true, crittr_pro_until: future },
      ),
      false,
    );
  });

  it("does not revoke known Pro when CustomerInfo has not been observed", () => {
    assert.equal(
      resolveClientIsCrittrPro(false, null, {
        crittr_pro_active: true,
        crittr_pro_until: future,
      }),
      true,
    );
  });

  it("preserves known-active CustomerInfo when a later fetch is unavailable", () => {
    assert.equal(
      resolveClientIsCrittrPro(
        true,
        ent({ isActive: true, expiresAt: future, willRenew: true }),
        { crittr_pro_active: false, crittr_pro_until: null },
      ),
      true,
    );
  });

  it("is not Pro when CustomerInfo was observed with no entitlement", () => {
    assert.equal(
      resolveClientIsCrittrPro(true, ent({ isActive: false }), {
        crittr_pro_active: true,
        crittr_pro_until: future,
      }),
      false,
    );
  });
});

describe("entitlementFromProfileMirror", () => {
  it("maps lifetime mirror rows", () => {
    const mapped = entitlementFromProfileMirror({
      crittr_pro_active: true,
      crittr_pro_until: null,
      subscription_will_renew: false,
      subscription_store: "promotional",
      crittr_pro_product_id: null,
      crittr_pro_ownership_type: "PURCHASED",
      crittr_pro_last_synced_at: "2026-08-14T00:00:00.000Z",
    });
    assert.equal(mapped?.isActive, true);
    assert.equal(mapped?.expiresAt, null);
    assert.equal(mapped?.source, "profile_mirror");
  });
});
