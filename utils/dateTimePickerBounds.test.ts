import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampDateToRange,
  PICKER_MAX_DATE,
  PICKER_MIN_DATE,
  resolvePickerBounds,
} from "./dateTimePickerBounds.ts";

const EPOCH = new Date(0);

describe("resolvePickerBounds", () => {
  it("substitutes the wide defaults when the caller has no bounds", () => {
    const value = new Date(2026, 7, 23, 18, 30);
    const bounds = resolvePickerBounds({ value });

    assert.equal(bounds.minimumDate.getTime(), PICKER_MIN_DATE.getTime());
    assert.equal(bounds.maximumDate.getTime(), PICKER_MAX_DATE.getTime());
    assert.equal(bounds.value.getTime(), value.getTime());
  });

  it("never resolves a bound to the Unix epoch", () => {
    for (const input of [
      { value: new Date(2026, 7, 23) },
      { value: new Date(2026, 7, 23), minimumDate: undefined },
      { value: new Date(2026, 7, 23), maximumDate: null },
      { value: new Date(2026, 7, 23), minimumDate: new Date(2020, 0, 1) },
    ]) {
      const bounds = resolvePickerBounds(input);
      assert.notEqual(bounds.minimumDate.getTime(), EPOCH.getTime());
      assert.notEqual(bounds.maximumDate.getTime(), EPOCH.getTime());
    }
  });

  it("keeps bounds the caller did supply", () => {
    const min = new Date(2020, 0, 1);
    const max = new Date(2030, 0, 1);
    const bounds = resolvePickerBounds({
      value: new Date(2026, 0, 1),
      minimumDate: min,
      maximumDate: max,
    });

    assert.equal(bounds.minimumDate.getTime(), min.getTime());
    assert.equal(bounds.maximumDate.getTime(), max.getTime());
  });

  it("clamps a value that sits outside the bounds", () => {
    const min = new Date(2020, 0, 1);
    const max = new Date(2030, 0, 1);

    assert.equal(
      resolvePickerBounds({
        value: new Date(1999, 0, 1),
        minimumDate: min,
        maximumDate: max,
      }).value.getTime(),
      min.getTime(),
    );
    assert.equal(
      resolvePickerBounds({
        value: new Date(2040, 0, 1),
        minimumDate: min,
        maximumDate: max,
      }).value.getTime(),
      max.getTime(),
    );
  });

  it("widens an inverted range instead of trapping the picker on one instant", () => {
    const bounds = resolvePickerBounds({
      value: new Date(2026, 7, 23),
      minimumDate: new Date(2030, 0, 1),
      maximumDate: new Date(2020, 0, 1),
    });

    assert.equal(bounds.minimumDate.getTime(), PICKER_MIN_DATE.getTime());
    assert.equal(bounds.maximumDate.getTime(), PICKER_MAX_DATE.getTime());
  });

  it("falls back to the defaults for unusable dates", () => {
    const bounds = resolvePickerBounds({
      value: new Date(2026, 7, 23),
      minimumDate: new Date("nonsense"),
      maximumDate: new Date("nonsense"),
    });

    assert.equal(bounds.minimumDate.getTime(), PICKER_MIN_DATE.getTime());
    assert.equal(bounds.maximumDate.getTime(), PICKER_MAX_DATE.getTime());
  });

  it("leaves every hour and minute of a time picker's day selectable", () => {
    const bounds = resolvePickerBounds({ value: new Date(2026, 7, 23, 12, 0) });

    for (let hour = 0; hour < 24; hour += 1) {
      for (const minute of [0, 30, 59]) {
        const slot = new Date(2026, 7, 23, hour, minute);
        assert.equal(
          clampDateToRange(slot, bounds.minimumDate, bounds.maximumDate).getTime(),
          slot.getTime(),
        );
      }
    }
  });
});

describe("clampDateToRange", () => {
  it("returns the value untouched when it is inside the range", () => {
    const value = new Date(2026, 0, 15);
    assert.equal(
      clampDateToRange(value, new Date(2026, 0, 1), new Date(2026, 1, 1)),
      value,
    );
  });

  it("returns the boundary when the value is outside", () => {
    const min = new Date(2026, 0, 1);
    const max = new Date(2026, 1, 1);

    assert.equal(
      clampDateToRange(new Date(2025, 0, 1), min, max).getTime(),
      min.getTime(),
    );
    assert.equal(
      clampDateToRange(new Date(2027, 0, 1), min, max).getTime(),
      max.getTime(),
    );
  });
});
