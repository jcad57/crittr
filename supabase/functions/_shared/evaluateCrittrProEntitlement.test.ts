import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluateEntitlement,
  isExpirationCurrentlyValid,
  summarizeEntitlement,
  type RcSubscriberPayload,
} from "./evaluateCrittrProEntitlement.ts";

const now = Date.parse("2026-08-14T12:00:00.000Z");
const future = "2026-09-14T12:00:00.000Z";
const past = "2026-07-14T12:00:00.000Z";

function payload(opts: {
  entitlements?: RcSubscriberPayload["subscriber"]["entitlements"];
  subscriptions?: RcSubscriberPayload["subscriber"]["subscriptions"];
}): RcSubscriberPayload {
  return {
    subscriber: {
      original_app_user_id: "user-1",
      entitlements: opts.entitlements ?? {},
      subscriptions: opts.subscriptions ?? {},
    },
  };
}

describe("isExpirationCurrentlyValid", () => {
  it("treats null / empty expiration as lifetime (still valid)", () => {
    assert.equal(isExpirationCurrentlyValid(null, now), true);
    assert.equal(isExpirationCurrentlyValid(undefined, now), true);
    assert.equal(isExpirationCurrentlyValid("", now), true);
  });

  it("accepts a future expiration", () => {
    assert.equal(isExpirationCurrentlyValid(future, now), true);
  });

  it("rejects a past expiration", () => {
    assert.equal(isExpirationCurrentlyValid(past, now), false);
  });
});

describe("evaluateEntitlement", () => {
  it("10/16 active monthly subscription → Pro", () => {
    const v = evaluateEntitlement(
      payload({
        entitlements: {
          crittr_pro: {
            expires_date: future,
            product_identifier: "crittr_pro_monthly",
            purchase_date: "2026-08-01T00:00:00.000Z",
          },
        },
        subscriptions: {
          crittr_pro_monthly: {
            expires_date: future,
            store: "app_store",
          },
        },
      }),
      now,
    );
    assert.equal(v.kind, "active");
    if (v.kind === "active") {
      assert.equal(v.summary.isActive, true);
      assert.equal(v.summary.expiresAt, future);
      assert.equal(v.summary.willRenew, true);
    }
  });

  it("active annual subscription → Pro", () => {
    const v = evaluateEntitlement(
      payload({
        entitlements: {
          crittr_pro: {
            expires_date: future,
            product_identifier: "crittr_pro_annual",
            purchase_date: "2026-08-01T00:00:00.000Z",
          },
        },
      }),
      now,
    );
    assert.equal(v.kind, "active");
  });

  it("12/19 canceled but still active → Pro, willRenew false", () => {
    const v = evaluateEntitlement(
      payload({
        entitlements: {
          crittr_pro: {
            expires_date: future,
            product_identifier: "crittr_pro_monthly",
            purchase_date: "2026-08-01T00:00:00.000Z",
          },
        },
        subscriptions: {
          crittr_pro_monthly: {
            expires_date: future,
            store: "app_store",
            unsubscribe_detected_at: "2026-08-05T00:00:00.000Z",
          },
        },
      }),
      now,
    );
    assert.equal(v.kind, "active");
    if (v.kind === "active") {
      assert.equal(v.summary.isActive, true);
      assert.equal(v.summary.willRenew, false);
      assert.equal(v.summary.expiresAt, future);
    }
  });

  it("13/18 expired subscription → confirmed inactive", () => {
    const v = evaluateEntitlement(
      payload({
        entitlements: {
          crittr_pro: {
            expires_date: past,
            product_identifier: "crittr_pro_monthly",
            purchase_date: "2026-06-01T00:00:00.000Z",
          },
        },
        subscriptions: {
          crittr_pro_monthly: {
            expires_date: past,
            store: "app_store",
          },
        },
      }),
      now,
    );
    assert.equal(v.kind, "confirmed_inactive");
  });

  it("11/16 lifetime RevenueCat grant → active with null expiration", () => {
    const v = evaluateEntitlement(
      payload({
        entitlements: {
          crittr_pro: {
            expires_date: null,
            product_identifier: "rc_promo_crittr_pro_lifetime",
            purchase_date: "2026-08-14T00:00:00.000Z",
          },
        },
      }),
      now,
    );
    assert.equal(v.kind, "active");
    if (v.kind === "active") {
      assert.equal(v.summary.isActive, true);
      assert.equal(v.summary.expiresAt, null);
      assert.equal(v.summary.willRenew, false);
    }
  });

  it("promotional grant with a duration is still Pro", () => {
    const v = evaluateEntitlement(
      payload({
        entitlements: {
          crittr_pro: {
            expires_date: future,
            product_identifier: "rc_promo_crittr_pro_monthly",
            purchase_date: "2026-08-14T00:00:00.000Z",
          },
        },
        subscriptions: {
          rc_promo_crittr_pro_monthly: {
            expires_date: future,
            store: "promotional",
          },
        },
      }),
      now,
    );
    assert.equal(v.kind, "active");
    if (v.kind === "active") {
      assert.equal(v.summary.store, "promotional");
    }
  });

  it("Family Sharing ownership is preserved", () => {
    const v = evaluateEntitlement(
      payload({
        entitlements: {
          crittr_pro: {
            expires_date: future,
            product_identifier: "crittr_pro_annual",
            purchase_date: "2026-08-01T00:00:00.000Z",
            ownership_type: "FAMILY_SHARED",
          },
        },
        subscriptions: {
          crittr_pro_annual: {
            expires_date: future,
            store: "app_store",
            ownership_type: "FAMILY_SHARED",
          },
        },
      }),
      now,
    );
    assert.equal(v.kind, "active");
    if (v.kind === "active") {
      assert.equal(v.summary.ownershipType, "FAMILY_SHARED");
    }
  });

  it("missing subscriber payload is unknown (do not downgrade)", () => {
    const v = evaluateEntitlement(null, now);
    assert.equal(v.kind, "unknown");
  });

  it("empty subscriber with no history is unknown (do not downgrade)", () => {
    const v = evaluateEntitlement(payload({}), now);
    assert.equal(v.kind, "unknown");
  });

  it("willRenew false is not treated as inactive", () => {
    const summary = summarizeEntitlement(
      payload({
        entitlements: {
          crittr_pro: {
            expires_date: future,
            product_identifier: "crittr_pro_annual",
            purchase_date: "2026-08-01T00:00:00.000Z",
          },
        },
        subscriptions: {
          crittr_pro_annual: {
            expires_date: future,
            store: "play_store",
            unsubscribe_detected_at: "2026-08-05T00:00:00.000Z",
          },
        },
      }),
      now,
    );
    assert.equal(summary.isActive, true);
    assert.equal(summary.willRenew, false);
  });
});
