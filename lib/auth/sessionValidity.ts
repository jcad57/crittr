import { supabase } from "@/lib/supabase";
import type { AuthChangeEvent } from "@supabase/supabase-js";

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

/** Validate the account with Auth without refreshing valid tokens on every startup.
 * A provider outage preserves the cached shell; a confirmed invalid user clears it.
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

  // getUser validates with Auth without forcing a token refresh on every launch.
  const { data, error } = await supabase.auth.getUser();
  if (error) return isLikelyTransientAuthFailure(error);
  return Boolean(data.user);
}
