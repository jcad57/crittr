import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { withTimeout } from "./withTimeout.ts";

describe("withTimeout", () => {
  it("returns the value when the promise settles in time", async () => {
    const value = await withTimeout(Promise.resolve("ok"), 50);
    assert.equal(value, "ok");
  });

  it("returns undefined when the deadline elapses first", async () => {
    const value = await withTimeout(
      new Promise<string>((resolve) => {
        setTimeout(() => resolve("late"), 40);
      }),
      10,
    );
    assert.equal(value, undefined);
  });

  it("returns undefined immediately for a non-positive budget", async () => {
    const value = await withTimeout(Promise.resolve("ok"), 0);
    assert.equal(value, undefined);
  });
});
