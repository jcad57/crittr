import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  firstSearchParam,
  isFromGuestParam,
  looksLikeEmail,
} from "./passwordResetParams.ts";

describe("firstSearchParam", () => {
  it("trims a string param", () => {
    assert.equal(firstSearchParam("  a@b.com  "), "a@b.com");
  });

  it("uses the first value when Expo passes an array", () => {
    assert.equal(firstSearchParam(["a@b.com", "other"]), "a@b.com");
  });

  it("returns empty string when missing", () => {
    assert.equal(firstSearchParam(undefined), "");
  });
});

describe("isFromGuestParam", () => {
  it("treats 1 and true as guest", () => {
    assert.equal(isFromGuestParam("1"), true);
    assert.equal(isFromGuestParam("true"), true);
  });

  it("treats anything else as signed-in", () => {
    assert.equal(isFromGuestParam("0"), false);
    assert.equal(isFromGuestParam("false"), false);
    assert.equal(isFromGuestParam(undefined), false);
  });
});

describe("looksLikeEmail", () => {
  it("accepts a typical address", () => {
    assert.equal(looksLikeEmail("jane.doe@gmail.com"), true);
  });

  it("rejects empty, spaced, or domain-less values", () => {
    assert.equal(looksLikeEmail(""), false);
    assert.equal(looksLikeEmail("not-an-email"), false);
    assert.equal(looksLikeEmail("jane @gmail.com"), false);
    assert.equal(looksLikeEmail("jane@gmail"), false);
  });
});
