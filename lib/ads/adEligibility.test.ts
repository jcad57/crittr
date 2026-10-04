import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAdsEligible, type AdsEligibilityInput } from "./adEligibility.ts";

const eligible: AdsEligibilityInput = {
  isLoggedIn: true,
  isHydrating: false,
  needsOnboarding: false,
  isPro: false,
  profilePending: false,
  profilePlaceholder: false,
  isOnLoggedInRoute: true,
  pathname: "/dashboard",
};

describe("isAdsEligible", () => {
  it("allows ads for signed-in non-Pro users in the logged-in shell", () => {
    assert.equal(isAdsEligible(eligible), true);
  });

  it("blocks ads when signed out", () => {
    assert.equal(isAdsEligible({ ...eligible, isLoggedIn: false }), false);
  });

  it("blocks ads for Crittr Pro", () => {
    assert.equal(isAdsEligible({ ...eligible, isPro: true }), false);
  });

  it("blocks ads during onboarding and hydration", () => {
    assert.equal(isAdsEligible({ ...eligible, needsOnboarding: true }), false);
    assert.equal(isAdsEligible({ ...eligible, isHydrating: true }), false);
  });

  it("blocks ads until the real profile is known", () => {
    assert.equal(isAdsEligible({ ...eligible, profilePending: true }), false);
    assert.equal(
      isAdsEligible({ ...eligible, profilePlaceholder: true }),
      false,
    );
  });

  it("blocks ads on auth and password-reset screens even with a session", () => {
    assert.equal(
      isAdsEligible({
        ...eligible,
        isOnLoggedInRoute: false,
        pathname: "/forgot-password",
      }),
      false,
    );
    assert.equal(
      isAdsEligible({
        ...eligible,
        isOnLoggedInRoute: false,
        pathname: "/reset-password-verify",
      }),
      false,
    );
    assert.equal(
      isAdsEligible({
        ...eligible,
        isOnLoggedInRoute: false,
        pathname: "/sign-in",
      }),
      false,
    );
  });

  it("blocks ads on paywall routes inside the logged-in shell", () => {
    assert.equal(
      isAdsEligible({ ...eligible, pathname: "/upgrade" }),
      false,
    );
    assert.equal(
      isAdsEligible({ ...eligible, pathname: "/pro-checkout" }),
      false,
    );
  });
});
