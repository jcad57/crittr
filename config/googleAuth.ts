/**
 * Native Google Sign-In client IDs.
 *
 * `webClientId` is the OAuth **Web** client. Native SDKs request an ID token
 * whose `aud` is this ID; Supabase verifies that token against the same Web
 * client configured on Authentication → Providers → Google.
 */
export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";

/**
 * iOS OAuth client from `GoogleService-Info.plist` (`CLIENT_ID`).
 * Passed to `GoogleSignin.configure` so the iOS SDK does not depend on the
 * plist being copied into the binary (it still should be, via `googleServicesFile`).
 */
export const GOOGLE_IOS_CLIENT_ID =
  "99305086331-nrckp166ef3h0258fiacpptff09o1jc9.apps.googleusercontent.com";

/** URL scheme for the iOS Google Sign-In callback (`REVERSED_CLIENT_ID`). */
export const GOOGLE_IOS_URL_SCHEME =
  "com.googleusercontent.apps.99305086331-nrckp166ef3h0258fiacpptff09o1jc9";
