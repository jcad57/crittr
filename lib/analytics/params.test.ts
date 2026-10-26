import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  petCountBucket,
  sanitizeEventName,
  sanitizeEventParams,
  screenNameFromPath,
} from "./params.ts";

describe("sanitizeEventName", () => {
  it("keeps valid snake_case names", () => {
    assert.equal(sanitizeEventName("pet_created"), "pet_created");
  });

  it("rejects reserved first_open so install attribution is not double-logged", () => {
    assert.equal(sanitizeEventName("first_open"), null);
  });

  it("rejects names that would collide with Google prefixes", () => {
    assert.equal(sanitizeEventName("firebase_click"), null);
    assert.equal(sanitizeEventName("google_ads"), null);
  });

  it("strips illegal characters and truncates", () => {
    const name = sanitizeEventName("Activity Logged!! " + "x".repeat(50));
    assert.ok(name);
    assert.ok(/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name));
    assert.ok(name.length <= 40);
  });
});

describe("sanitizeEventParams", () => {
  it("drops nulls and empty strings, keeps primitives", () => {
    assert.deepEqual(
      sanitizeEventParams({
        activity_type: "exercise",
        empty: "  ",
        skipped: null,
        count: 2,
        first: true,
      }),
      { activity_type: "exercise", count: 2, first: true },
    );
  });

  it("truncates long string values", () => {
    const params = sanitizeEventParams({ note: "n".repeat(150) });
    assert.equal(params?.note.length, 100);
  });
});

describe("petCountBucket", () => {
  it("buckets household size for user properties", () => {
    assert.equal(petCountBucket(0), "0");
    assert.equal(petCountBucket(1), "1");
    assert.equal(petCountBucket(4), "2_plus");
  });
});

describe("screenNameFromPath", () => {
  it("normalizes expo-router paths", () => {
    assert.equal(
      screenNameFromPath("/(logged-in)/(tabs)/dashboard"),
      "(logged-in)/(tabs)/dashboard",
    );
    assert.equal(screenNameFromPath("/"), "index");
  });
});
