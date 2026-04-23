import { supabase } from "@/lib/supabase";
import { sleep } from "@/utils/async";
import type { AuthChangeEvent } from "@supabase/supabase-js";

/** Avoid hanging the whole Supabase client on a stuck `refreshSession()` (blocks sign-out & DB). */
export const AUTH_REFRESH_BUDGET_MS = 12_000;

export function isLikelyTransientAuthFailure(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  const message = String((error as Error)?.message ?? "").toLowerCase();
  const name = (error as { name?: string })?.name;

  if (name === "AuthRetryableFetchError") return true;

  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("internet") ||
    message.includes("timeout") ||
    message.includes("connection") ||
    message.includes("offline")
  ) {
    return true;
  }
  if (status === 0) return true;
  if (typeof status === "number" && status >= 500) return true;
  if (status === 429) return true;
  return false;
}

/**
 * `getSession()` only reads persisted tokens. After auth user deletion, the access JWT can
 * still verify locally while `profiles` is gone — `resolveSession` then sends users to
 * onboarding. `refreshSession()` hits the Auth server with the refresh token; deleted
 * users lose valid refresh tokens, so this reliably detects removal.
 *
 * If refresh fails for **any** reason that is not clearly transient (network / 5xx / 429),
 * we treat the session as invalid — do **not** fall back to `getUser()` alone, because
 * `getUser()` can still succeed on a locally-valid JWT while the account is gone.
 * Only on transient refresh failures do we fall back to `getUser()` for offline tolerance.
 *
 * `INITIAL_SESSION` must not call `refreshSession()`: `initialize()` already refreshed on
 * cold start, and a second refresh here serializes behind the same GoTrue lock and can
 * stall sign-out and PostgREST across the app.
 */
export async function isAuthUserStillRegistered(
  event?: AuthChangeEvent,
): Promise<boolean> {
  /**
   * Session is already server-valid for these events, or was validated in `initialize()`
   * before this listener ran (`INITIAL_SESSION`).
   */
  if (
    event === "TOKEN_REFRESHED" ||
    event === "USER_UPDATED" ||
    event === "SIGNED_IN" ||
    event === "INITIAL_SESSION" ||
    /**
     * `verifyOtp` with `type: "recovery"` awaits `onAuthStateChange` before
     * resolving. A nested `refreshSession()` from this handler contends for the
     * same GoTrue lock and can deadlock / stall the app on the "Confirm" button.
     * The session from the recovery verify response is already server-valid.
     */
    event === "PASSWORD_RECOVERY"
  ) {
    return true;
  }

  const refreshRace = await Promise.race([
    supabase.auth.refreshSession().then((r) => ({ tag: "refresh" as const, r })),
    sleep(AUTH_REFRESH_BUDGET_MS).then(() => ({ tag: "timeout" as const })),
  ]);

  if (refreshRace.tag === "timeout") {
    const { data, error: userError } = await supabase.auth.getUser();
    if (!userError && !data?.user) return false;
    if (userError && !isLikelyTransientAuthFailure(userError)) return false;
    return true;
  }

  const { data: refreshed, error: refreshError } = refreshRace.r;

  if (!refreshError && refreshed?.session) {
    return true;
  }

  if (!refreshError && !refreshed?.session) {
    return false;
  }

  if (refreshError && isLikelyTransientAuthFailure(refreshError)) {
    const { data, error: userError } = await supabase.auth.getUser();
    if (!userError && !data?.user) return false;
    if (userError && !isLikelyTransientAuthFailure(userError)) return false;
    return true;
  }

  return false;
}
