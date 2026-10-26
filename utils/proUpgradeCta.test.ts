import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { proPaywallDisclaimer, proCheckoutPriceSubline, proUpgradeCtaLabel } from "./proUpgradeCta.ts";

describe("proUpgradeCtaLabel", () => {
  it("uses the store trial duration when eligible", () => {
    assert.equal(
      proUpgradeCtaLabel({
        resolved: true,
        trial: { durationLabel: "7-day" },
      }),
      "Start 7-day free trial",
    );
  });

  it("does not promise a trial when the store says the user is ineligible", () => {
    assert.equal(
      proUpgradeCtaLabel({ resolved: true, trial: null }),
      "Continue to Crittr Pro",
    );
  });

  it("does not promise a trial before pricing is resolved", () => {
    assert.equal(
      proUpgradeCtaLabel({
        resolved: false,
        trial: { durationLabel: "7-day" },
      }),
      "Continue to Crittr Pro",
    );
  });
});

describe("proPaywallDisclaimer", () => {
  it("mentions the trial only when the user can still start one", () => {
    assert.equal(
      proPaywallDisclaimer({ durationLabel: "7-day" }),
      "No charge until your 7-day trial ends · Cancel anytime",
    );
  });

  it("does not mention a trial to returning customers", () => {
    assert.equal(proPaywallDisclaimer(null), "Cancel anytime");
  });
});

describe("proCheckoutPriceSubline", () => {
  it("states the post-trial price when eligible", () => {
    assert.equal(
      proCheckoutPriceSubline({
        formatted: "$39.99",
        cadence: "yr",
        trial: { durationLabel: "7-day" },
      }),
      "$39.99/yr after your 7-day free trial",
    );
  });

  it("states the price without a trial for returning customers", () => {
    assert.equal(
      proCheckoutPriceSubline({
        formatted: "$4.99",
        cadence: "mo",
        trial: null,
      }),
      "$4.99/mo · Cancel anytime",
    );
  });
});
