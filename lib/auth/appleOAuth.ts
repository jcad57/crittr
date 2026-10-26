import {
  isNativeSocialCancelled,
  type NativeSocialSignInResult,
} from "@/lib/auth/nativeSocial";
import { supabase } from "@/lib/supabase";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";

export type AppleSignInResult = NativeSocialSignInResult;

function randomNonce(byteCount = 32): string {
  const bytes = Crypto.getRandomBytes(byteCount);
  const alphabet =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}

async function hashedNonce(raw: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
}

/**
 * Native Sign in with Apple → Supabase `signInWithIdToken`.
 * iOS only. Creates the account on first use (no email OTP).
 *
 * Apple only returns the user's name on the *first* authorization. We persist
 * it onto `auth.users` metadata and `profiles` when present.
 *
 * @throws On configuration / network / provider error. User cancel returns `cancelled`.
 */
export async function signInWithAppleNative(): Promise<AppleSignInResult> {
  if (Platform.OS !== "ios") {
    throw new Error("Sign in with Apple is only available on iPhone and iPad.");
  }

  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    throw new Error("Sign in with Apple is not available on this device.");
  }

  const rawNonce = randomNonce();
  const nonce = await hashedNonce(rawNonce);

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce,
    });
  } catch (e) {
    if (isNativeSocialCancelled(e)) return { status: "cancelled" };
    throw e;
  }

  if (!credential.identityToken) {
    throw new Error("Apple did not return a sign-in token.");
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;
  if (!data.session) {
    throw new Error("Sign-in could not be completed. Please try again.");
  }

  const firstName = credential.fullName?.givenName?.trim() || "";
  const lastName = credential.fullName?.familyName?.trim() || "";
  if (firstName || lastName) {
    try {
      await supabase.auth.updateUser({
        data: {
          first_name: firstName || undefined,
          last_name: lastName || undefined,
        },
      });
      await supabase
        .from("profiles")
        .update({
          ...(firstName ? { first_name: firstName } : {}),
          ...(lastName ? { last_name: lastName } : {}),
        })
        .eq("id", data.session.user.id);
    } catch {
      /* name is best-effort; session is already valid */
    }
  }

  return { status: "signed_in", session: data.session };
}
