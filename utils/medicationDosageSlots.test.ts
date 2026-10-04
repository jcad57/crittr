import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  decodeMedicationDosageSlots,
  encodeMedicationDosageDisplay,
  splitDosage,
} from "./medicationDosageSlots.ts";

describe("splitDosage", () => {
  it("splits a known type off the amount", () => {
    assert.deepEqual(splitDosage("1 Tablet"), {
      amount: "1",
      type: "Tablet",
    });
  });

  it("keeps free-text amounts that are not a known type", () => {
    assert.deepEqual(splitDosage("10mg twice"), {
      amount: "10mg twice",
      type: "",
    });
  });
});

describe("encodeMedicationDosageDisplay", () => {
  it("stores a single shared amount when every dose matches", () => {
    const encoded = encodeMedicationDosageDisplay([
      { dosageAmount: "1", dosageType: "Tablet" },
      { dosageAmount: "1", dosageType: "Tablet" },
    ]);
    assert.equal(encoded, "1 Tablet");
  });

  it("joins distinct amounts for round-trip", () => {
    const encoded = encodeMedicationDosageDisplay([
      { dosageAmount: "1", dosageType: "Tablet" },
      { dosageAmount: "0.5", dosageType: "Tablet" },
    ]);
    assert.equal(encoded, "1 Tablet · 0.5 Tablet");
  });
});

describe("decodeMedicationDosageSlots", () => {
  it("applies a shared dosage to every reminder slot", () => {
    assert.deepEqual(decodeMedicationDosageSlots("1 Tablet", 2), [
      { amount: "1", type: "Tablet" },
      { amount: "1", type: "Tablet" },
    ]);
  });

  it("splits per-slot amounts when encoded", () => {
    assert.deepEqual(
      decodeMedicationDosageSlots("1 Tablet · 0.5 Tablet", 2),
      [
        { amount: "1", type: "Tablet" },
        { amount: "0.5", type: "Tablet" },
      ],
    );
  });
});
