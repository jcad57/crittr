import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  customerInfoSliceHasCrittrPro,
  entitlementFromCustomerInfoSlice,
} from "../crittrPro.ts";

type EntitlementStub = {
  isActive: boolean;
  expirationDate: string | null;
  willRenew: boolean;
  store: string;
  productIdentifier: string;
  ownershipType: string;
  originalPurchaseDate: string;
  latestPurchaseDate: string;
};

function stubInfo(opts: {
  active?: Record<string, EntitlementStub>;
  all?: Record<string, EntitlementStub>;
}) {
  return {
    entitlements: {
      active: opts.active ?? {},
      all: opts.all ?? opts.active ?? {},
    },
  } as Parameters<typeof entitlementFromCustomerInfoSlice>[0];
}

const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

function makeEnt(overrides: Partial<EntitlementStub> = {}): EntitlementStub {
  return {
    isActive: true,
    expirationDate: future,
    willRenew: true,
    store: "APP_STORE",
    productIdentifier: "crittr_pro_monthly",
    ownershipType: "PURCHASED",
    originalPurchaseDate: future,
    latestPurchaseDate: future,
    ...overrides,
  };
}

describe("customerInfoSliceHasCrittrPro", () => {
  it("is Pro for an active monthly entitlement", () => {
    const info = stubInfo({
      active: {
        crittr_pro: makeEnt({ productIdentifier: "crittr_pro_monthly" }),
      },
    });
    assert.equal(customerInfoSliceHasCrittrPro(info), true);
  });

  it("is Pro for an active annual entitlement", () => {
    const info = stubInfo({
      active: {
        crittr_pro: makeEnt({ productIdentifier: "crittr_pro_annual" }),
      },
    });
    assert.equal(customerInfoSliceHasCrittrPro(info), true);
  });

  it("is Pro when canceled but still in the paid period", () => {
    const info = stubInfo({
      active: {
        crittr_pro: makeEnt({ willRenew: false, expirationDate: future }),
      },
    });
    assert.equal(customerInfoSliceHasCrittrPro(info), true);
  });

  it("is Pro for a lifetime grant (expirationDate null)", () => {
    const info = stubInfo({
      active: {
        crittr_pro: makeEnt({
          expirationDate: null,
          willRenew: false,
          store: "PROMOTIONAL",
        }),
      },
    });
    assert.equal(customerInfoSliceHasCrittrPro(info), true);
  });

  it("is Pro for a promotional grant in active entitlements", () => {
    const info = stubInfo({
      active: {
        crittr_pro: makeEnt({
          store: "PROMOTIONAL",
          productIdentifier: "rc_promo_crittr_pro_lifetime",
          expirationDate: null,
          willRenew: false,
        }),
      },
    });
    assert.equal(customerInfoSliceHasCrittrPro(info), true);
  });

  it("is Pro for Family Sharing", () => {
    const info = stubInfo({
      active: { crittr_pro: makeEnt({ ownershipType: "FAMILY_SHARED" }) },
    });
    assert.equal(customerInfoSliceHasCrittrPro(info), true);
  });

  it("is not Pro when the entitlement is only historical / expired", () => {
    const info = stubInfo({
      active: {},
      all: {
        crittr_pro: makeEnt({
          isActive: false,
          expirationDate: past,
          willRenew: false,
        }),
      },
    });
    assert.equal(customerInfoSliceHasCrittrPro(info), false);
  });

  it("is not Pro when there is no crittr_pro entitlement", () => {
    assert.equal(
      customerInfoSliceHasCrittrPro(stubInfo({ active: {} })),
      false,
    );
  });

  it("recognizes an explicitly supported legacy dashboard grant", () => {
    const info = stubInfo({
      active: {
        "Crittr Pro": makeEnt({ expirationDate: null, store: "PROMOTIONAL" }),
      },
    });
    assert.equal(customerInfoSliceHasCrittrPro(info), true);
    assert.equal(entitlementFromCustomerInfoSlice(info).expiresAt, null);
  });

  it("prefers a lifetime grant over a recurring plan across the supported IDs", () => {
    const info = stubInfo({
      active: {
        crittr_pro: makeEnt(),
        "Crittr Pro": makeEnt({
          expirationDate: null,
          productIdentifier: "rc_promo_legacy_lifetime",
          store: "PROMOTIONAL",
          willRenew: false,
        }),
      },
    });
    assert.equal(
      entitlementFromCustomerInfoSlice(info).productIdentifier,
      "rc_promo_legacy_lifetime",
    );
    assert.equal(entitlementFromCustomerInfoSlice(info).expiresAt, null);
    assert.equal(
      customerInfoSliceHasCrittrPro(
        stubInfo({ active: { unrelated: makeEnt() } }),
      ),
      false,
    );
  });
});

describe("entitlementFromCustomerInfoSlice", () => {
  it("does not treat null expiration as inactive", () => {
    const mapped = entitlementFromCustomerInfoSlice(
      stubInfo({
        active: {
          crittr_pro: makeEnt({ expirationDate: null, willRenew: false }),
        },
      }),
    );
    assert.equal(mapped.isActive, true);
    assert.equal(mapped.expiresAt, null);
    assert.equal(mapped.willRenew, false);
  });

  it("captures canceled-but-active metadata", () => {
    const mapped = entitlementFromCustomerInfoSlice(
      stubInfo({
        active: {
          crittr_pro: makeEnt({ willRenew: false, expirationDate: future }),
        },
      }),
    );
    assert.equal(mapped.isActive, true);
    assert.equal(mapped.willRenew, false);
    assert.equal(mapped.expiresAt, future);
  });
});
