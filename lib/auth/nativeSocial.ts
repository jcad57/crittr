import type { Session } from "@supabase/supabase-js";

export type NativeSocialSignInResult =
  | { status: "signed_in"; session: Session }
  | { status: "cancelled" };

export function isNativeSocialCancelled(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code) : "";
  return (
    code === "ERR_REQUEST_CANCELED" ||
    code === "ERR_CANCELED" ||
    code === "-5" ||
    code === "12501" ||
    code === "SIGN_IN_CANCELLED"
  );
}

export function mapNativeSocialError(error: unknown, provider: "google" | "apple"): string {
  if (error instanceof Error && error.message.trim()) {
    const m = error.message.toLowerCase();
    if (m.includes("network") || m.includes("internet")) {
      return "Check your connection and try again.";
    }
    if (m.includes("play services")) {
      return "Google Play Services is required for Google sign-in.";
    }
    if (m.includes("id token") || m.includes("identitytoken")) {
      return `${provider === "apple" ? "Apple" : "Google"} did not return a sign-in token. Please try again.`;
    }
    if (
      m.includes("nonce") ||
      m.includes("audience") ||
      m.includes("invalid jwt") ||
      m.includes("unacceptable audience")
    ) {
      return `${provider === "apple" ? "Apple" : "Google"} sign-in is not fully configured yet. Please try email sign-in or try again later.`;
    }
    return error.message.trim();
  }
  return `Could not sign in with ${provider === "apple" ? "Apple" : "Google"}. Please try again.`;
}
