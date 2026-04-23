import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/utils/async";

export type SigninMethodHint =
  | "email"
  | "google"
  | "not_found"
  | "invalid";

/** Same family as sign-up / password-reset: auth can stall; surface a clear timeout. */
const AUTH_USER_UPDATE_TIMEOUT_MS = 45_000;

/** Updates the authenticated user's email (may require confirmation via Supabase settings). */
export async function updateAuthEmail(email: string) {
  const { data, error } = await withTimeout(
    supabase.auth.updateUser({ email }),
    AUTH_USER_UPDATE_TIMEOUT_MS,
    "Update email",
  );
  if (error) throw error;
  return data;
}

/** Updates the authenticated user's password. Requires an active auth session. */
export async function updateAuthPassword(password: string) {
  const { data, error } = await withTimeout(
    supabase.auth.updateUser({ password }),
    AUTH_USER_UPDATE_TIMEOUT_MS,
    "Update password",
  );
  if (error) throw error;
  return data;
}

/**
 * Sends the Supabase "Reset Password" recovery email. When the template is
 * configured to expose `{{ .Token }}` the user receives a 6-digit OTP they can
 * enter in-app (see `docs/supabase-email-otp-setup.md`).
 */
const AUTH_PASSWORD_RESET_ACTION_TIMEOUT_MS = 45_000;

export async function requestPasswordResetOtp(email: string) {
  const { error } = await withTimeout(
    supabase.auth.resetPasswordForEmail(email),
    AUTH_PASSWORD_RESET_ACTION_TIMEOUT_MS,
    "Send reset code",
  );
  if (error) throw error;
}

/**
 * Verifies a 6-digit recovery OTP. On success Supabase returns a short-lived
 * session that authorizes `supabase.auth.updateUser({ password })`.
 */
export async function verifyPasswordResetOtp(email: string, token: string) {
  const { data, error } = await withTimeout(
    supabase.auth.verifyOtp({
      email,
      token,
      type: "recovery",
    }),
    AUTH_PASSWORD_RESET_ACTION_TIMEOUT_MS,
    "Verify reset code",
  );
  if (error) throw error;
  return data;
}

/**
 * Unauthenticated: how this email was registered, for post-login UX on wrong password
 * (e.g. Google-only account should use "Continue with Google"). Does not run when signed in.
 */
export async function getSigninMethodHint(
  email: string,
): Promise<SigninMethodHint> {
  const { data, error } = await supabase.rpc("get_signin_method_hint", {
    p_email: email.trim(),
  });
  if (error) {
    if (__DEV__) {
      console.warn("[auth] get_signin_method_hint", error);
    }
    return "not_found";
  }
  if (data === "email" || data === "google" || data === "not_found") {
    return data;
  }
  if (data === "invalid") return "invalid";
  return "not_found";
}
