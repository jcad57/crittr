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

const verified = { crittr_pro_active: true, crittr_pro_until: future, crittr_pro_last_synced_at: new Date().toISOString(), subscription_environment: "production" as const };
describe("verified server profile access", () => {
  it("accepts a recent verified purchase", () => assert.equal(isCrittrProFromProfile(verified), true));
  it("rejects a bare manually enabled flag", () => assert.equal(isCrittrProFromProfile({crittr_pro_active:true,crittr_pro_until:null}),false));
  it("rejects legacy expiry-only rows", () => assert.equal(isCrittrProFromProfile({crittr_pro_until:future}),false));
  it("rejects expired, stale and invalid snapshots", () => {
    for (const override of [{crittr_pro_until:past},{crittr_pro_last_synced_at:past},{crittr_pro_until:"invalid"},{subscription_environment:null},{crittr_pro_active:false}]) {
      const profile = {...verified,...override};
      // A one-day-old verification is still fresh; explicitly exceed the offline window.
      if (override.crittr_pro_last_synced_at) profile.crittr_pro_last_synced_at = new Date(Date.now()-73*3600_000).toISOString();
      assert.equal(isCrittrProFromProfile(profile),false);
    }
  });
  it("accepts verified lifetime and time-bounded admin grants", () => {
    assert.equal(isCrittrProFromProfile({...verified,crittr_pro_until:null}),true);
    assert.equal(isCrittrProFromProfile({...verified,subscription_environment:"admin",crittr_pro_last_synced_at:new Date(Date.now()-10*86400_000).toISOString()}),true);
    assert.equal(isCrittrProFromProfile({...verified,subscription_environment:"admin",crittr_pro_until:past}),false);
  });
  it("keeps UI aligned with the server even when native CustomerInfo disagrees", () => {
    assert.equal(resolveClientIsCrittrPro(true,ent({isActive:true}),{...verified,crittr_pro_active:false}),false);
    assert.equal(resolveClientIsCrittrPro(true,ent({isActive:false}),verified),true);
  });
  it("maps lifetime metadata without inferring access from null expiry", () => {
    const mirror=entitlementFromProfileMirror({...verified,crittr_pro_until:null,subscription_will_renew:false,subscription_store:"promotional"});
    assert.equal(mirror?.isActive,true);assert.equal(mirror?.expiresAt,null);
  });
});
