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
  it("treats explicit null expiration as lifetime and rejects empty dates", () => {
    assert.equal(isExpirationCurrentlyValid(null, now), true);
    assert.equal(isExpirationCurrentlyValid(undefined, now), false);
    assert.equal(isExpirationCurrentlyValid("", now), false);
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

  it("empty verified subscriber confirms no entitlement", () => {
    const v = evaluateEntitlement(payload({}), now);
    assert.equal(v.kind, "confirmed_inactive");
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

  it("honors legacy lifetime grants alongside expired canonical purchases", () => {
    const result = evaluateEntitlement(
      payload({
        entitlements: {
          crittr_pro: {
            expires_date: past,
            product_identifier: "monthly",
            purchase_date: past,
          },
          "Crittr Pro": {
            expires_date: null,
            product_identifier: "rc_promo_legacy_lifetime",
            purchase_date: past,
          },
        },
      }),
      now,
    );
    assert.equal(result.kind, "active");
    if (result.kind === "active") {
      assert.equal(result.summary.expiresAt, null);
      assert.equal(result.summary.store, "promotional");
    }
  });

  it("selects lifetime over an active monthly entitlement", () => {
    const result = evaluateEntitlement(
      payload({
        entitlements: {
          crittr_pro: {
            expires_date: future,
            product_identifier: "monthly",
            purchase_date: past,
          },
          "Crittr Pro": {
            expires_date: null,
            product_identifier: "rc_promo_legacy_lifetime",
            purchase_date: past,
          },
        },
      }),
      now,
    );
    assert.equal(result.kind, "active");
    if (result.kind === "active") assert.equal(result.summary.expiresAt, null);
  });

  it("never treats a promotional transaction as recurring or sandbox-only access", () => {
    const data = payload({
      entitlements: {
        crittr_pro: {
          expires_date: future,
          product_identifier: "rc_promo_monthly",
          purchase_date: past,
        },
      },
      subscriptions: {
        rc_promo_monthly: {
          expires_date: future,
          store: "promotional",
          is_sandbox: true,
        },
      },
    });
    const result = evaluateEntitlement(data, now, { allowSandbox: false });
    assert.equal(result.kind, "active");
    if (result.kind === "active") {
      assert.equal(result.summary.willRenew, false);
      assert.equal(result.summary.isSandbox, false);
    }
  });

  it("keeps access through billing grace, then expires it", () => {
    const data = payload({
      entitlements: {
        crittr_pro: {
          expires_date: past,
          product_identifier: "monthly",
          purchase_date: past,
        },
      },
      subscriptions: {
        monthly: {
          expires_date: past,
          store: "app_store",
          grace_period_expires_date: future,
          billing_issues_detected_at: past,
        },
      },
    });
    const result = evaluateEntitlement(data, now);
    assert.equal(result.kind, "active");
    if (result.kind === "active") {
      assert.equal(result.summary.expiresAt, future);
      assert.equal(result.summary.willRenew, false);
    }
    assert.equal(
      evaluateEntitlement(data, Date.parse(future)).kind,
      "confirmed_inactive",
    );
  });

  it("matches the current Google Play base plan rather than a refunded old plan", () => {
    const result = evaluateEntitlement(
      payload({
        entitlements: {
          crittr_pro: {
            expires_date: future,
            product_identifier: "pro",
            purchase_date: past,
          },
        },
        subscriptions: {
          "pro:old": {
            expires_date: past,
            store: "play_store",
            refunded_at: past,
          },
          "pro:annual": { expires_date: future, store: "play_store" },
        },
      }),
      now,
    );
    assert.equal(result.kind, "active");
    if (result.kind === "active")
      assert.equal(result.summary.store, "play_store");
  });

  it("checks sandbox eligibility for one-time lifetime purchases", () => {
    const data = payload({
      entitlements: {
        crittr_pro: {
          expires_date: null,
          product_identifier: "lifetime",
          purchase_date: past,
        },
      },
    });
    data.subscriber.non_subscriptions = {
      lifetime: [{ store: "app_store", is_sandbox: true, purchase_date: past }],
    };
    assert.equal(
      evaluateEntitlement(data, now, { allowSandbox: false }).kind,
      "confirmed_inactive",
    );
    const result = evaluateEntitlement(data, now, { allowSandbox: true });
    assert.equal(result.kind, "active");
    if (result.kind === "active") {
      assert.equal(result.summary.store, "app_store");
      assert.equal(result.summary.willRenew, false);
    }
  });

  it("preserves the last verification for malformed provider responses", () => {
    for (const entitlements of [
      undefined,
      [],
      "invalid",
      { crittr_pro: {} },
      { crittr_pro: { product_identifier: "pro", expires_date: "invalid" } },
    ]) {
      const data = {
        subscriber: { entitlements, subscriptions: {} },
      } as unknown as RcSubscriberPayload;
      assert.equal(evaluateEntitlement(data, now).kind, "unknown");
    }
    assert.equal(
      evaluateEntitlement(
        payload({
          entitlements: {
            unrelated: {
              expires_date: null,
              product_identifier: "other",
              purchase_date: past,
            },
          },
        }),
        now,
      ).kind,
      "confirmed_inactive",
    );
  });
});
