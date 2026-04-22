/**
 * Shared app-lifecycle state used by `reactQueryFocusManager` and `appResumeHandler`
 * so they can coordinate without firing duplicate refetches on resume.
 *
 * Both modules listen to `AppState`. Without coordination:
 *   - On a stale resume (>=30s away), `focusManager` triggers `refetchOnWindowFocus`
 *     for every mounted query AND `appResumeHandler` cancels + invalidates everything
 *     — the focus-driven fetches are started and immediately cancelled.
 *   - For short backgrounds (<30s), only `focusManager` should fire (resume handler
 *     intentionally skips).
 */

let lastBackgroundedAt: number | null = null;

export const STALE_RESUME_AFTER_MS = 30_000;

export function noteAppBackgrounded(at: number): void {
  lastBackgroundedAt = at;
}

export function consumeAppForegroundedAwayMs(): number {
  if (lastBackgroundedAt == null) return 0;
  const away = Date.now() - lastBackgroundedAt;
  lastBackgroundedAt = null;
  return away;
}

/**
 * Same as `consumeAppForegroundedAwayMs` but does NOT clear the stored timestamp;
 * use to peek without invalidating the resume handler's view of the same transition.
 */
export function peekAppForegroundedAwayMs(): number {
  if (lastBackgroundedAt == null) return 0;
  return Date.now() - lastBackgroundedAt;
}
