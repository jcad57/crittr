/** First native store-review prompt: 24 hours after first launch (proxy for download). */
export const APP_RATING_INITIAL_DELAY_MS = 24 * 60 * 60 * 1000;

/**
 * Recurring gap after we present the native sheet. The OS does not tell us
 * whether the user rated or dismissed, so each presentation consumes a week.
 */
export const APP_RATING_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

export type AppRatingState = {
  firstOpenAt: number;
  lastSnoozedAt: number | null;
  completedAt: number | null;
};

export function isAppRatingCompleted(state: AppRatingState): boolean {
  return state.completedAt != null;
}

/**
 * Instant the prompt may appear, or `null` if the user already left a rating.
 * After a presentation, eligibility is the later of the 24h first-prompt time
 * and 7 days after the last native sheet.
 */
export function nextAppRatingEligibleAt(state: AppRatingState): number | null {
  if (state.completedAt != null) return null;
  if (!Number.isFinite(state.firstOpenAt)) return null;
  const initialAt = state.firstOpenAt + APP_RATING_INITIAL_DELAY_MS;
  if (state.lastSnoozedAt == null || !Number.isFinite(state.lastSnoozedAt)) {
    return initialAt;
  }
  return Math.max(initialAt, state.lastSnoozedAt + APP_RATING_SNOOZE_MS);
}

export function shouldShowAppRatingPrompt(
  state: AppRatingState,
  now: number,
): boolean {
  const at = nextAppRatingEligibleAt(state);
  return at != null && now >= at;
}

/** Milliseconds until the prompt is due, `0` if due now, `null` if never again. */
export function msUntilAppRatingEligible(
  state: AppRatingState,
  now: number,
): number | null {
  const at = nextAppRatingEligibleAt(state);
  if (at == null) return null;
  return Math.max(0, at - now);
}
