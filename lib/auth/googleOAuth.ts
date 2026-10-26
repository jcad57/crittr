import {
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID,
} from "@/config/googleAuth";
import { supabase } from "@/lib/supabase";
import {
  isNativeSocialCancelled,
  type NativeSocialSignInResult,
} from "@/lib/auth/nativeSocial";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { Platform } from "react-native";

export type GoogleSignInResult = NativeSocialSignInResult;

let configured = false;

/**
 * Must run once before `GoogleSignin.signIn()`. Safe to call repeatedly.
 * `webClientId` is required so the ID token audience matches the Web client
 * configured in the Supabase Google provider.
 */
export function configureGoogleSignIn(): void {
  if (configured) return;
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error(
      "Google sign-in is missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.",
    );
  }
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    ...(Platform.OS === "ios" ? { iosClientId: GOOGLE_IOS_CLIENT_ID } : {}),
    offlineAccess: false,
  });
  configured = true;
}

function isGoogleCancel(error: unknown): boolean {
  if (isNativeSocialCancelled(error)) return true;
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  const code = String((error as { code?: unknown }).code);
  return (
    code === statusCodes.SIGN_IN_CANCELLED ||
    code === String(statusCodes.SIGN_IN_CANCELLED)
  );
}

/**
 * Native Google Sign-In → Supabase `signInWithIdToken`.
 * Creates the account on first use (same as email sign-up, without OTP).
 *
 * @throws On configuration / network / provider error. User cancel returns `cancelled`.
 */
export async function signInWithGoogleNative(): Promise<GoogleSignInResult> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    throw new Error("Google sign-in is only available on iOS and Android.");
  }

  configureGoogleSignIn();

  if (Platform.OS === "android") {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }

  /**
   * Clear the Google SDK session so the account picker appears (equivalent to
   * OAuth `prompt=select_account`). Failures here just mean nobody was signed in.
   */
  try {
    await GoogleSignin.signOut();
  } catch {
    /* no prior Google session */
  }

  let response: Awaited<ReturnType<typeof GoogleSignin.signIn>>;
  try {
    response = await GoogleSignin.signIn();
  } catch (e) {
    if (isGoogleCancel(e)) return { status: "cancelled" };
    throw e;
  }

  if (response.type === "cancelled") {
    return { status: "cancelled" };
  }

  const idToken = response.data.idToken;
  if (!idToken) {
    throw new Error("Google sign-in did not return an ID token.");
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: idToken,
  });
  if (error) throw error;
  if (!data.session) {
    throw new Error("Sign-in could not be completed. Please try again.");
  }
  return { status: "signed_in", session: data.session };
}

/** Drop the Google SDK session so the next native sign-in can pick an account. */
export async function signOutGoogleSdk(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    /* already signed out of Google, or native module unavailable */
  }
}
