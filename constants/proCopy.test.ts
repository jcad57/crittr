import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { softPaywallCopy } from "../constants/proCopy.ts";

describe("softPaywallCopy", () => {
  it("names the pet in contextual copy", () => {
    const meds = softPaywallCopy("medications", "Charlie");
    assert.match(meds.body, /Charlie/);
    assert.equal(meds.title, "Track more medications");
  });

  it("falls back when the pet name is missing", () => {
    const food = softPaywallCopy("food", "  ");
    assert.match(food.body, /your pet/);
  });

  it("positions co-care as sharing care, not a feature label", () => {
    const copy = softPaywallCopy("coCare", "Charlie");
    assert.equal(copy.title, "Care is better together");
    assert.match(copy.body, /someone to help share/);
  });
});
