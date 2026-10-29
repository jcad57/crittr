import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PRO_ACTIVATION_FALLBACK_WAIT_MS,
  PRO_ACTIVATION_PAYWALL_WAIT_MS,
  resolveProActivationWaitMs,
} from "./proActivation.ts";
import { postPurchaseHref, proWelcomeHref } from "../../utils/proUpgradePaths.ts";

describe("resolveProActivationWaitMs", () => {
  it("does not block the UI when RevenueCat already unlocked Pro after purchase", () => {
    assert.equal(
      resolveProActivationWaitMs({
        source: "purchase",
        revenueCatAlreadyHasPro: true,
      }),
      0,
    );
  });

  it("does not block restore or paywall when the SDK already has Pro", () => {
    assert.equal(
      resolveProActivationWaitMs({
        source: "restore",
        revenueCatAlreadyHasPro: true,
      }),
      0,
    );
    assert.equal(
      resolveProActivationWaitMs({
        source: "paywall",
        revenueCatAlreadyHasPro: true,
      }),
      0,
    );
  });

  it("uses a short bounded wait when the SDK has not confirmed yet", () => {
    assert.equal(
      resolveProActivationWaitMs({
        source: "purchase",
        revenueCatAlreadyHasPro: false,
      }),
      PRO_ACTIVATION_FALLBACK_WAIT_MS,
    );
    assert.equal(
      resolveProActivationWaitMs({
        source: "restore",
        revenueCatAlreadyHasPro: false,
      }),
      PRO_ACTIVATION_FALLBACK_WAIT_MS,
    );
    assert.equal(
      resolveProActivationWaitMs({
        source: "paywall",
        revenueCatAlreadyHasPro: false,
      }),
      PRO_ACTIVATION_PAYWALL_WAIT_MS,
    );
  });
});

describe("postPurchaseHref", () => {
  it("lands on welcome-to-pro by default", () => {
    assert.equal(postPurchaseHref(), "/(logged-in)/welcome-to-pro");
    assert.equal(postPurchaseHref(undefined), "/(logged-in)/welcome-to-pro");
  });

  it("honors returnTo for settings and subscriptions", () => {
    assert.equal(postPurchaseHref("settings"), "/(logged-in)/settings");
    assert.equal(
      postPurchaseHref("subscriptions"),
      "/(logged-in)/subscriptions",
    );
  });
});

describe("proWelcomeHref", () => {
  it("celebrates new purchases before returning to settings or subscription management", () => {
    assert.equal(proWelcomeHref("settings"), "/(logged-in)/welcome-to-pro?returnTo=settings");
    assert.equal(proWelcomeHref("subscriptions"), "/(logged-in)/welcome-to-pro?returnTo=subscriptions");
    assert.equal(proWelcomeHref("https://unexpected.invalid"), "/(logged-in)/welcome-to-pro");
  });
});
