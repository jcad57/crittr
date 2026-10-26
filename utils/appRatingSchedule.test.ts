import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  APP_RATING_INITIAL_DELAY_MS,
  APP_RATING_SNOOZE_MS,
  isAppRatingCompleted,
  msUntilAppRatingEligible,
  nextAppRatingEligibleAt,
  shouldShowAppRatingPrompt,
  type AppRatingState,
} from "./appRatingSchedule.ts";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const FIRST_OPEN = 1_700_000_000_000;

function state(
  overrides: Partial<AppRatingState> = {},
): AppRatingState {
  return {
    firstOpenAt: FIRST_OPEN,
    lastSnoozedAt: null,
    completedAt: null,
    ...overrides,
  };
}

describe("nextAppRatingEligibleAt", () => {
  it("is 24 hours after first open when the user has never snoozed", () => {
    assert.equal(
      nextAppRatingEligibleAt(state()),
      FIRST_OPEN + APP_RATING_INITIAL_DELAY_MS,
    );
  });

  it("returns null after the user confirmed a rating", () => {
    assert.equal(
      nextAppRatingEligibleAt(state({ completedAt: FIRST_OPEN + DAY })),
      null,
    );
  });

  it("is 7 days after the last snooze once the initial 24h has passed", () => {
    const snoozedAt = FIRST_OPEN + 2 * DAY;
    assert.equal(
      nextAppRatingEligibleAt(state({ lastSnoozedAt: snoozedAt })),
      snoozedAt + APP_RATING_SNOOZE_MS,
    );
  });

  it("after an early snooze, waits 7 days from that tap (still after the 24h mark)", () => {
    const earlySnooze = FIRST_OPEN + HOUR;
    assert.equal(
      nextAppRatingEligibleAt(state({ lastSnoozedAt: earlySnooze })),
      earlySnooze + APP_RATING_SNOOZE_MS,
    );
  });

  it("returns null when firstOpenAt is not a finite number", () => {
    assert.equal(
      nextAppRatingEligibleAt(state({ firstOpenAt: Number.NaN })),
      null,
    );
  });
});

describe("shouldShowAppRatingPrompt", () => {
  it("is false before 24 hours", () => {
    assert.equal(
      shouldShowAppRatingPrompt(state(), FIRST_OPEN + APP_RATING_INITIAL_DELAY_MS - 1),
      false,
    );
  });

  it("is true at exactly 24 hours", () => {
    assert.equal(
      shouldShowAppRatingPrompt(state(), FIRST_OPEN + APP_RATING_INITIAL_DELAY_MS),
      true,
    );
  });

  it("is true after 24 hours if they have never been prompted", () => {
    assert.equal(
      shouldShowAppRatingPrompt(state(), FIRST_OPEN + 10 * DAY),
      true,
    );
  });

  it("is false after a presentation until exactly 7 days later", () => {
    const snoozedAt = FIRST_OPEN + 2 * DAY;
    const s = state({ lastSnoozedAt: snoozedAt });
    assert.equal(
      shouldShowAppRatingPrompt(s, snoozedAt + APP_RATING_SNOOZE_MS - 1),
      false,
    );
    assert.equal(
      shouldShowAppRatingPrompt(s, snoozedAt + APP_RATING_SNOOZE_MS),
      true,
    );
  });

  it("keeps recurring every 7 days after repeated snoozes", () => {
    const secondSnooze = FIRST_OPEN + 9 * DAY;
    const s = state({ lastSnoozedAt: secondSnooze });
    assert.equal(
      shouldShowAppRatingPrompt(s, secondSnooze + APP_RATING_SNOOZE_MS - 1),
      false,
    );
    assert.equal(
      shouldShowAppRatingPrompt(s, secondSnooze + APP_RATING_SNOOZE_MS),
      true,
    );
  });

  it("never shows again after they leave a rating", () => {
    const s = state({
      lastSnoozedAt: FIRST_OPEN + 2 * DAY,
      completedAt: FIRST_OPEN + 9 * DAY,
    });
    assert.equal(isAppRatingCompleted(s), true);
    assert.equal(
      shouldShowAppRatingPrompt(s, FIRST_OPEN + 365 * DAY),
      false,
    );
  });
});

describe("msUntilAppRatingEligible", () => {
  it("returns the remaining time before the first prompt", () => {
    assert.equal(
      msUntilAppRatingEligible(state(), FIRST_OPEN + 23 * HOUR),
      HOUR,
    );
  });

  it("returns 0 when the prompt is already due", () => {
    assert.equal(
      msUntilAppRatingEligible(state(), FIRST_OPEN + 2 * DAY),
      0,
    );
  });

  it("returns null after a completed rating", () => {
    assert.equal(
      msUntilAppRatingEligible(
        state({ completedAt: FIRST_OPEN + DAY }),
        FIRST_OPEN + 2 * DAY,
      ),
      null,
    );
  });
});
