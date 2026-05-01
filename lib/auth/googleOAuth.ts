import { supabase } from "@/lib/supabase";
import { makeRedirectUri } from "expo-auth-session";
import * as Linking from "expo-linking";
import type { Session } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import { WebBrowserResultType } from "expo-web-browser";

/** Add this URL to Supabase → Authentication → URL configuration → Additional redirect URLs. */
export const GOOGLE_OAUTH_REDIRECT = makeRedirectUri({ path: "auth/callback" });

/**
 * Supabase + Expo: open the provider in an in-app browser, then complete PKCE
 * (or token) from the return URL. Session is updated via the auth state listener.
 */
function parseCallbackParams(url: string): Record<string, string> {
  const parsed = Linking.parse(url);
  const raw = (parsed.queryParams ?? {}) as Record<
    string,
    string | string[] | undefined
  >;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v == null) continue;
    out[k] = Array.isArray(v) ? (v[0] ?? "") : v;
  }
  const hash = url.split("#")[1];
  if (hash) {
    for (const part of hash.split("&")) {
      const [key, value] = part.split("=");
      if (key && value) {
        try {
          out[key] = decodeURIComponent(value);
        } catch {
          out[key] = value;
        }
      }
    }
  }
  return out;
}

export type GoogleSignInResult =
  | { status: "signed_in"; session: Session }
  | { status: "cancelled" };

/**
 * @throws On configuration / network / OAuth error (user cancellation returns `cancelled`).
 */
export async function signInWithGoogleWithBrowser(): Promise<GoogleSignInResult> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: GOOGLE_OAUTH_REDIRECT,
      skipBrowserRedirect: true,
      /** Always show Google’s account picker so “sign out / sign in again” can switch accounts. */
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) throw error;
  if (!data?.url) throw new Error("Could not start Google sign-in.");

  const res = await WebBrowser.openAuthSessionAsync(
    data.url,
    GOOGLE_OAUTH_REDIRECT,
  );

  if (res.type === "success" && "url" in res && res.url) {
    // continue below
  } else {
    if (
      res.type === WebBrowserResultType.CANCEL ||
      res.type === WebBrowserResultType.DISMISS ||
      res.type === WebBrowserResultType.LOCKED
    ) {
      return { status: "cancelled" };
    }
    throw new Error("Could not complete Google sign-in. Please try again.");
  }

  const returnUrl = (res as { type: "success"; url: string }).url;

  const params = parseCallbackParams(returnUrl);
  if (params.error) {
    const desc = params.error_description;
    const msg = desc
      ? `${params.error}: ${desc}`
      : params.error;
    throw new Error(msg);
  }
  if (params.code) {
    const { data, error: exchangeErr } =
      await supabase.auth.exchangeCodeForSession(params.code);
    if (exchangeErr) throw exchangeErr;
    if (!data.session) {
      throw new Error("Sign-in could not be completed. Please try again.");
    }
    return { status: "signed_in", session: data.session };
  }
  if (params.access_token && params.refresh_token) {
    const { data, error: sessionErr } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (sessionErr) throw sessionErr;
    if (!data.session) {
      throw new Error("Sign-in could not be completed. Please try again.");
    }
    return { status: "signed_in", session: data.session };
  }
  throw new Error("Sign-in could not be completed. Please try again.");
}
