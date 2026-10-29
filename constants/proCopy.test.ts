import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FREE_TIER_SUMMARY, PRO_PAYWALL_BENEFITS, softPaywallCopy } from "../constants/proCopy.ts";

describe("revised tier messaging", () => {
  it("shows all four Pro benefits and the Free allowances", () => {
    assert.deepEqual(PRO_PAYWALL_BENEFITS.map((b) => b.title), ["Unlimited pets", "Unlimited co-carers", "Medical record storage", "CrittrAI"]);
    assert.match(FREE_TIER_SUMMARY, /3 pets, 1 co-carer per pet/);
    assert.match(FREE_TIER_SUMMARY, /unlimited activity logs, foods, medications, and vaccinations/);
  });
  it("explains pet and co-carer thresholds", () => {
    assert.match(softPaywallCopy("pets").body, /3 pets, including memorialized pets/);
    const copy = softPaywallCopy("coCare", "Charlie");
    assert.match(copy.body, /1 co-carer per pet/);
    assert.match(copy.body, /Charlie/);
    assert.match(copy.body, /Pending invites reserve a spot/);
  });
  it("names the pet in medical and AI copy, with a fallback", () => {
    assert.match(softPaywallCopy("records", "Charlie").body, /Charlie/);
    assert.match(softPaywallCopy("crittrAi", "  ").body, /your pet/);
  });
});
