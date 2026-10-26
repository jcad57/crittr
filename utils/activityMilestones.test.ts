import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  highestMilestoneReached,
  pickUncelebratedMilestone,
} from "./activityMilestones.ts";

describe("highestMilestoneReached", () => {
  it("returns null below the first milestone", () => {
    assert.equal(highestMilestoneReached(0), null);
    assert.equal(highestMilestoneReached(9), null);
  });

  it("returns the highest milestone at or below the count", () => {
    assert.equal(highestMilestoneReached(10), 10);
    assert.equal(highestMilestoneReached(24), 10);
    assert.equal(highestMilestoneReached(25), 25);
    assert.equal(highestMilestoneReached(100), 100);
    assert.equal(highestMilestoneReached(200), 200);
  });

  it("continues in 250-activity steps after 500", () => {
    assert.equal(highestMilestoneReached(500), 500);
    assert.equal(highestMilestoneReached(749), 500);
    assert.equal(highestMilestoneReached(750), 750);
  });
});

describe("pickUncelebratedMilestone", () => {
  it("returns the highest newly reached milestone only", () => {
    assert.equal(pickUncelebratedMilestone(50, []), 50);
    assert.equal(pickUncelebratedMilestone(50, [10, 25]), 50);
  });

  it("returns null when that milestone was already celebrated", () => {
    assert.equal(pickUncelebratedMilestone(25, [10, 25]), null);
    assert.equal(pickUncelebratedMilestone(9, []), null);
  });

  it("does not restack skipped milestones after a higher one was shown", () => {
    assert.equal(pickUncelebratedMilestone(100, [100]), null);
    assert.equal(pickUncelebratedMilestone(50, [100]), null);
  });
});
