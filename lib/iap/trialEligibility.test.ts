import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  iosEligibilityKindFromStatus,
  resolveStoreTrialOffer,
} from "./trialEligibility.ts";

const intro = { durationLabel: "7-day", iso8601: "P7D" };
const weekPhase = { unit: "WEEK", value: 1, iso8601: "P1W" };

describe("resolveStoreTrialOffer", () => {
  it("advertises an iOS trial only when StoreKit says the Apple ID is eligible", () => {
    assert.deepEqual(
      resolveStoreTrialOffer({
        platform: "ios",
        androidFreePhase: null,
        iosIntroTrial: intro,
        iosEligibility: "eligible",
      }),
      intro,
    );
  });

  it("hides the iOS trial for returning Apple IDs (ineligible)", () => {
    assert.equal(
      resolveStoreTrialOffer({
        platform: "ios",
        androidFreePhase: null,
        iosIntroTrial: intro,
        iosEligibility: "ineligible",
      }),
      null,
    );
  });

  it("hides the iOS trial when eligibility is unknown (do not promise)", () => {
    assert.equal(
      resolveStoreTrialOffer({
        platform: "ios",
        androidFreePhase: null,
        iosIntroTrial: intro,
        iosEligibility: "unknown",
      }),
      null,
    );
  });

  it("hides the iOS trial when no intro offer exists", () => {
    assert.equal(
      resolveStoreTrialOffer({
        platform: "ios",
        androidFreePhase: null,
        iosIntroTrial: intro,
        iosEligibility: "no_intro_offer",
      }),
      null,
    );
  });

  it("uses Play's default free phase as Android eligibility", () => {
    assert.deepEqual(
      resolveStoreTrialOffer({
        platform: "android",
        androidFreePhase: weekPhase,
        iosIntroTrial: intro,
        iosEligibility: "unknown",
      }),
      { durationLabel: "7-day", iso8601: "P1W" },
    );
  });

  it("does not use a catalog introPrice on Android when Play omitted the free phase", () => {
    assert.equal(
      resolveStoreTrialOffer({
        platform: "android",
        androidFreePhase: null,
        iosIntroTrial: intro,
        iosEligibility: "eligible",
      }),
      null,
    );
  });
});

describe("iosEligibilityKindFromStatus", () => {
  it("maps RC numeric statuses", () => {
    assert.equal(iosEligibilityKindFromStatus(2, 2, 1, 3), "eligible");
    assert.equal(iosEligibilityKindFromStatus(1, 2, 1, 3), "ineligible");
    assert.equal(iosEligibilityKindFromStatus(3, 2, 1, 3), "no_intro_offer");
    assert.equal(iosEligibilityKindFromStatus(0, 2, 1, 3), "unknown");
    assert.equal(iosEligibilityKindFromStatus(undefined, 2, 1, 3), "unknown");
  });
});
