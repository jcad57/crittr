import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/utils/async";

export type SigninMethodHint =
  | "email"
  | "google"
  | "not_found"
  | "invalid";

/** Auth calls can stall on a bad connection; surface a clear timeout instead. */
const AUTH_ACTION_TIMEOUT_MS = 45_000;

/**
 * Register a new account. A `null` session back from Supabase means the project
 * requires email confirmation before the user can sign in.
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
): Promise<{ needsEmailVerification: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName },
    },
  });
  if (error) throw error;
  return { needsEmailVerification: !data.session };
}

/** Confirms the 6-digit code emailed after `signUpWithEmail`. */
export async function verifySignupOtp(email: string, token: string) {
  const { error } = await withTimeout(
    supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    }),
    AUTH_ACTION_TIMEOUT_MS,
    "Confirm email",
  );
  if (error) throw error;
}

export async function resendSignupOtp(email: string) {
  const { error } = await withTimeout(
    supabase.auth.resend({
      type: "signup",
      email,
    }),
    AUTH_ACTION_TIMEOUT_MS,
    "Resend code",
  );
  if (error) throw error;
}

export async function signInWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Ask the backend to erase the account, then drop the local session.
 *
 * The edge function reports failure two ways — a transport error and a 200 with
 * an `error` field — so both are checked before anything local is torn down.
 */
export async function requestAccountDeletion() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in.");

  const { data, error } = await supabase.functions.invoke("delete-account", {
    method: "POST",
  });

  if (error) {
    throw new Error(error.message ?? "Could not delete account.");
  }
  if (data && typeof data === "object" && data !== null && "error" in data) {
    const d = data as { error?: string; message?: string };
    throw new Error(d.message ?? d.error ?? "Could not delete account.");
  }

  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    /* session may already be invalid */
  }
}

/** Updates the authenticated user's email (may require confirmation via Supabase settings). */
export async function updateAuthEmail(email: string) {
  const { data, error } = await withTimeout(
    supabase.auth.updateUser({ email }),
    AUTH_ACTION_TIMEOUT_MS,
    "Update email",
  );
  if (error) throw error;
  return data;
}

/** Updates the authenticated user's password. Requires an active auth session. */
export async function updateAuthPassword(password: string) {
  const { data, error } = await withTimeout(
    supabase.auth.updateUser({ password }),
    AUTH_ACTION_TIMEOUT_MS,
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
export async function requestPasswordResetOtp(email: string) {
  const { error } = await withTimeout(
    supabase.auth.resetPasswordForEmail(email),
    AUTH_ACTION_TIMEOUT_MS,
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
    AUTH_ACTION_TIMEOUT_MS,
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
